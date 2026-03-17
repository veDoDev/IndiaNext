import re
import os
import requests
import time
from typing import List, Dict, Tuple
from dotenv import load_dotenv
from models.schemas import AnalyzeTextResponse, FlaggedPhrase

load_dotenv()

HF_API_TOKEN = os.getenv("HF_API_TOKEN", "")

URGENCY_PATTERNS = [
    (r'\b(urgent|urgently)\b', 'Urgency trigger — creates panic to prevent clear thinking', 'red'),
    (r'\b24 hours?\b|\b48 hours?\b|\b72 hours?\b', 'Artificial deadline — classic phishing pressure tactic', 'red'),
    (r'\b(expire[sd]?|expiring)\b', 'Expiry claim — forces immediate action without verification', 'amber'),
    (r'\bimmediately\b|\bright now\b|\bat once\b', 'Immediacy language — suppresses rational decision-making', 'red'),
    (r'\bfinal notice\b|\blast warning\b|\bfinal warning\b', 'Final notice framing — implies severe consequences', 'red'),
]

ACTION_TRAP_PATTERNS = [
    (r'click here|click the link|click below', 'Deceptive CTA — masks actual destination URL', 'red'),
    (r'\bverify your (account|password|identity|information|details)\b', 'Credential harvesting request', 'red'),
    (r'\bconfirm your (account|payment|details|information)\b', 'Confirmation trap — used to harvest personal data', 'amber'),
    (r'\bupdate your (payment|billing|credit card|account)\b', 'Payment info phishing', 'red'),
    (r'\bprovide your\b|\bsubmit your\b|\benter your\b', 'Data harvesting — requesting sensitive info via email', 'amber'),
]

CREDENTIAL_PATTERNS = [
    (r'\bpassword\b', 'Password mention — legitimate services never request passwords via email', 'red'),
    (r'\b(ssn|social security|national id)\b', 'SSN/National ID request — never shared over email legitimately', 'red'),
    (r'\b(otp|one[- ]time password|pin|cvv)\b', 'Security code request — banks never ask for OTPs via email', 'red'),
    (r'\b(account number|routing number|bank details)\b', 'Banking details request — hallmark of financial phishing', 'red'),
    (r'\bcredit card\b', 'Credit card mention — payment info requests via email are suspicious', 'amber'),
]

IMPERSONATION_PATTERNS = [
    (r'\b(paypal|pay-pal)\b', 'PayPal impersonation — top phishing brand target', 'amber'),
    (r'\b(amazon|amaz0n)\b', 'Amazon impersonation — frequently spoofed', 'amber'),
    (r'\b(apple|icloud|itunes)\b', 'Apple impersonation — common credential theft vector', 'amber'),
    (r'\b(microsoft|windows|outlook|office 365)\b', 'Microsoft impersonation — enterprise phishing target', 'amber'),
    (r'\b(irs|income tax|tax refund|hmrc)\b', 'Tax authority impersonation — creates legal fear', 'red'),
    (r'\b(netflix|spotify|hulu)\b', 'Streaming service impersonation — payment info harvesting', 'amber'),
    (r'\b(bank|hsbc|chase|wells fargo|citibank|hdfc|sbi|icici)\b', 'Bank impersonation — financial credential theft', 'red'),
    (r'\b(google|gmail|facebook|instagram)\b', 'Social platform impersonation — account takeover attempt', 'amber'),
]

REWARD_SCAM_PATTERNS = [
    (r'\byou (have won|are selected|are chosen|won)\b', 'Lottery/prize scam — nobody randomly wins prizes via email', 'red'),
    (r'\b(free gift|gift card|cash prize|reward)\b', 'Reward lure — used to attract victims', 'amber'),
    (r'\bclaim your\b', 'Claim framing — creates false entitlement', 'amber'),
    (r'\b(million|billion)\b.*\b(dollar|usd|transfer|fund)\b', 'Advance fee fraud (419 scam) pattern', 'red'),
    (r'\bprocessing fee\b|\bsmall fee\b|\badmin fee\b', 'Advance fee request — classic scam tactic', 'red'),
]

SUSPICIOUS_URL_PATTERNS = [
    (r'http[s]?://[^\s]*\.(tk|ml|ga|cf|gq|ru|cc|xyz|work|click|loan)', 'Suspicious TLD — commonly used for phishing domains', 'red'),
    (r'(secure|verify|login|update|account|confirm)-[^\s]+\.(com|net|org)', 'Lookalike domain pattern', 'red'),
    (r'http[s]?://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', 'Raw IP address link — legitimate companies never use IP URLs', 'red'),
    (r'bit\.ly|tinyurl|t\.co|ow\.ly|short\.|rb\.gy', 'URL shortener — hides actual destination', 'amber'),
]

ALL_PATTERNS = (URGENCY_PATTERNS + ACTION_TRAP_PATTERNS + CREDENTIAL_PATTERNS +
                IMPERSONATION_PATTERNS + REWARD_SCAM_PATTERNS + SUSPICIOUS_URL_PATTERNS)


def get_hf_prediction(text: str) -> Tuple[float, float]:
    if not HF_API_TOKEN:
        return 0.0, 0.0
    url = "https://router.huggingface.co/hf-inference/models/ealvaradob/bert-finetuned-phishing"
    headers = {"Authorization": f"Bearer {HF_API_TOKEN}"}
    for i in range(3):
        try:
            resp = requests.post(url, headers=headers, json={"inputs": text}, timeout=15)
            if resp.status_code == 200:
                result = resp.json()
                if isinstance(result, list):
                    res = result[0] if isinstance(result[0], list) else result
                else:
                    res = [result]
                phish_items = [d for d in res if d.get('label', '').lower() in ['phishing', 'label_1', '1']]
                if phish_items:
                    best = max(phish_items, key=lambda x: x.get('score', 0))
                    max_score = max(d.get('score', 0) for d in res)
                    return float(best['score']), float(max_score)
                return 0.0, 0.0
            elif resp.status_code in [503, 504]:
                time.sleep(5 + i * 2)
                continue
            else:
                break
        except Exception:
            break
    return 0.0, 0.0


def analyze_patterns(text: str):
    text_lower = text.lower()
    flagged = []
    pattern_score = 0
    rec_type = 'generic_phishing'

    for pattern, reason, level in ALL_PATTERNS:
        for match in re.finditer(pattern, text_lower):
            flagged.append(FlaggedPhrase(text=match.group(), reason=reason, level=level))
            pattern_score += (18 if level == 'red' else 8)

    cred_match = any(re.search(p[0], text_lower) for p in CREDENTIAL_PATTERNS)
    adv_match = bool(re.search(r'\b(million|billion)\b.*\b(dollar|usd|transfer|fund)\b', text_lower))
    prize_match = any(re.search(p[0], text_lower) for p in REWARD_SCAM_PATTERNS)
    imp_match = any(re.search(p[0], text_lower) for p in IMPERSONATION_PATTERNS)
    urg_match = any(re.search(p[0], text_lower) for p in URGENCY_PATTERNS)

    if cred_match: rec_type = 'credential_harvest'
    elif adv_match: rec_type = 'advance_fee'
    elif prize_match: rec_type = 'prize_scam'
    elif imp_match: rec_type = 'impersonation'
    elif urg_match: rec_type = 'urgency_trap'

    return flagged[:10], min(pattern_score, 100), rec_type


def get_nlp_score(text: str) -> int:
    score = 0
    caps_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)
    if caps_ratio > 0.25: score += 15
    if text.count('!') >= 3: score += 10
    if re.search(r'\$(\d+)', text): score += 10
    if re.search(r'\b(dear (customer|user|friend|account holder|sir|madam))\b', text.lower()): score += 10
    return min(score, 45)


RECOMMENDATIONS = {
    'credential_harvest': 'DO NOT enter your credentials. Legitimate services never request passwords via email. Change your passwords immediately if you already clicked.',
    'advance_fee': 'This is advance fee fraud. Do not respond, share details, or send money. Block the sender.',
    'prize_scam': 'You did not win a prize. Do not respond or provide personal information.',
    'impersonation': 'Do NOT click any links. Navigate directly to the official website to check your account.',
    'urgency_trap': 'Urgency is the primary weapon here. Do not act — verify the claim independently via official channels.',
    'generic_phishing': 'Do not click links or provide personal information. Report to your IT security team.',
    'safe': 'No significant threats detected. Apply standard email hygiene.',
}


def analyze_phishing_advanced(text: str) -> AnalyzeTextResponse:
    hf_prob, hf_conf = get_hf_prediction(text)
    flagged_phrases, pattern_score, rec_type = analyze_patterns(text)
    nlp_score = get_nlp_score(text)

    if hf_conf > 0.6:
        threat_score = int((hf_prob * 50) + (pattern_score * 0.35) + (nlp_score * 0.15))
        confidence = hf_conf
    else:
        threat_score = int((pattern_score * 0.65) + (nlp_score * 0.35))
        confidence = 0.75

    threat_score = min(100, threat_score)
    verdict = 'PHISHING' if threat_score > 48 else 'LEGIT'
    severity = 'LOW' if threat_score < 30 else 'MED' if threat_score < 60 else 'HIGH' if threat_score < 85 else 'CRIT'

    action = RECOMMENDATIONS.get(rec_type if verdict == 'PHISHING' else 'safe', RECOMMENDATIONS['generic_phishing'])

    return AnalyzeTextResponse(
        threat_score=threat_score,
        severity=severity,
        verdict=verdict,
        confidence=round(confidence, 3),
        flagged_phrases=flagged_phrases,
        recommended_action=action,
    )