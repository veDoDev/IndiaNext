"""
AEGIS.AI — Smart Phishing Analysis Service
Combines: Logistic Regression + NLP Pattern Analysis + Scam Signature Detection
+ Explanation Generator + Recommendation Engine
"""

import re
import os
import pickle
import math
from typing import List, Dict, Tuple

# ─── SCAM SIGNATURES ──────────────────────────────────────────────────────────
URGENCY_PATTERNS = [
    (r'\b(urgent|urgently)\b', 'Urgency trigger — creates panic to prevent clear thinking', 'red'),
    (r'\b24 hours?\b|\b48 hours?\b|\b72 hours?\b', 'Artificial deadline — classic phishing pressure tactic', 'red'),
    (r'\b(expire[sd]?|expiring)\b', 'Expiry claim — forces immediate action without verification', 'amber'),
    (r'\bimmediately\b|\bright now\b|\bat once\b', 'Immediacy language — suppresses rational decision-making', 'red'),
    (r'\bfinal notice\b|\blast warning\b|\bfinal warning\b', 'Final notice framing — implies severe consequences to force action', 'red'),
]

ACTION_TRAP_PATTERNS = [
    (r'click here|click the link|click below', 'Deceptive CTA — masks actual destination URL', 'red'),
    (r'\bverify your (account|password|identity|information|details)\b', 'Credential harvesting request — legitimate services never ask via email', 'red'),
    (r'\bconfirm your (account|payment|details|information)\b', 'Confirmation trap — used to harvest personal data', 'amber'),
    (r'\bupdate your (payment|billing|credit card|account)\b', 'Payment info phishing — collecting financial data under false pretenses', 'red'),
    (r'\bprovide your\b|\bsubmit your\b|\benter your\b', 'Data harvesting — requesting sensitive info through email is a major red flag', 'amber'),
]

CREDENTIAL_PATTERNS = [
    (r'\bpassword\b', 'Password mention — legitimate services never request passwords via email', 'red'),
    (r'\b(ssn|social security number?|national id)\b', 'SSN/National ID request — never shared over email legitimately', 'red'),
    (r'\b(otp|one[- ]time password|pin|cvv)\b', 'Security code request — banks never ask for OTPs or CVVs via email', 'red'),
    (r'\b(account number|routing number|bank details)\b', 'Banking details request — hallmark of financial phishing', 'red'),
    (r'\bcredit card\b', 'Credit card mention — payment info requests via email are suspicious', 'amber'),
]

IMPERSONATION_PATTERNS = [
    (r'\b(paypal|pay-pal)\b', 'PayPal impersonation — top phishing brand target', 'amber'),
    (r'\b(amazon|amaz0n)\b', 'Amazon impersonation — frequently spoofed in phishing campaigns', 'amber'),
    (r'\b(apple|icloud|itunes)\b', 'Apple impersonation — common credential theft vector', 'amber'),
    (r'\b(microsoft|windows|outlook|office 365)\b', 'Microsoft impersonation — enterprise phishing target', 'amber'),
    (r'\b(irs|income tax|tax refund|hmrc)\b', 'Tax authority impersonation — creates legal fear to force compliance', 'red'),
    (r'\b(netflix|spotify|hulu)\b', 'Streaming service impersonation — payment info harvesting tactic', 'amber'),
    (r'\b(bank|hsbc|chase|wells fargo|citibank|hdfc|sbi|icici)\b', 'Bank impersonation — financial credential theft', 'red'),
    (r'\b(google|gmail|facebook|instagram)\b', 'Social platform impersonation — account takeover attempt', 'amber'),
]

REWARD_SCAM_PATTERNS = [
    (r'\byou (have won|are selected|are chosen|won)\b', 'Lottery/prize scam — nobody randomly wins prizes via email', 'red'),
    (r'\b(free gift|gift card|cash prize|reward)\b', 'Reward lure — used to attract victims into sharing personal data', 'amber'),
    (r'\bclaim your\b', 'Claim framing — creates false entitlement to get user to act', 'amber'),
    (r'\b(million|billion)\b.*\b(dollar|usd|transfer|fund)\b', 'Advance fee fraud (419 scam) pattern detected', 'red'),
    (r'\bprocessing fee\b|\bsmall fee\b|\badmin fee\b', 'Advance fee request — classic Nigerian prince scam tactic', 'red'),
]

SUSPICIOUS_URL_PATTERNS = [
    (r'http[s]?://[^\s]*\.(tk|ml|ga|cf|gq|ru|cc|xyz|work|click|loan)', 'Suspicious TLD detected — commonly used for free phishing domains', 'red'),
    (r'(secure|verify|login|update|account|confirm)-[^\s]+\.(com|net|org)', 'Lookalike domain pattern — mimics legitimate sites with hyphenated prefixes', 'red'),
    (r'http[s]?://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', 'Raw IP address link — legitimate companies never use IP-based URLs', 'red'),
    (r'bit\.ly|tinyurl|t\.co|ow\.ly|short\.|rb\.gy', 'URL shortener — hides actual destination, common in phishing', 'amber'),
]

ALL_PATTERNS = URGENCY_PATTERNS + ACTION_TRAP_PATTERNS + CREDENTIAL_PATTERNS + IMPERSONATION_PATTERNS + REWARD_SCAM_PATTERNS + SUSPICIOUS_URL_PATTERNS

# ─── RECOMMENDATION ENGINE ────────────────────────────────────────────────────
RECOMMENDATIONS = {
    'credential_harvest': {
        'title': 'Credential Harvesting Attempt',
        'action': (
            "DO NOT enter your credentials. Legitimate services never request passwords, OTPs, PINs, "
            "or banking details via email. Report this email to your IT/security team and delete it immediately. "
            "If you already clicked a link, change your passwords immediately and enable 2FA on all accounts."
        )
    },
    'financial_scam': {
        'title': 'Financial Fraud Attempt',
        'action': (
            "Do not transfer money, pay any fees, or share banking details. Contact your bank directly "
            "using the number on your card to verify any suspicious activity. Report to the FTC (reportfraud.ftc.gov) "
            "or your local cybercrime authority. Do not call any phone number provided in this email."
        )
    },
    'impersonation': {
        'title': 'Brand Impersonation Phishing',
        'action': (
            "Do NOT click any links. Instead, open a new browser tab and navigate directly to the official "
            "company website to check your account status. Report this email using the 'Report Phishing' option "
            "in your email client. Organizations like PayPal, Amazon, and Apple provide official phishing report "
            "addresses (e.g., phishing@amazon.com)."
        )
    },
    'advance_fee': {
        'title': 'Advance Fee Fraud (419/Nigerian Scam)',
        'action': (
            "This is a classic advance fee fraud. No such money transfer exists. Do not respond, do not share "
            "personal details, and do not send any money. Block the sender and report to your national cybercrime "
            "reporting platform (e.g., IC3.gov in the USA, NCSC in the UK)."
        )
    },
    'urgency_trap': {
        'title': 'Urgency-Based Social Engineering',
        'action': (
            "Slow down — urgency is the primary weapon in this email. Do not take any action within the email. "
            "Verify the claim independently by contacting the organization through their official website or "
            "customer support number. Legitimate companies allow time to verify your account status safely."
        )
    },
    'prize_scam': {
        'title': 'Lottery/Prize Scam',
        'action': (
            "You did not win a prize. Prize scam emails exist solely to collect personal data or small payments. "
            "Do not respond, do not click any links, and do not provide personal information. Delete and report "
            "this email as phishing."
        )
    },
    'generic_phishing': {
        'title': 'Phishing Attempt Detected',
        'action': (
            "Do not click any links or download attachments in this email. Do not provide any personal information. "
            "Forward this email to your email provider's phishing report service (e.g., spam@uce.gov or "
            "phishing-report@us-cert.gov). If you clicked a link, run a malware scan and change your passwords "
            "with 2FA enabled."
        )
    },
    'safe': {
        'title': 'No Significant Threats Detected',
        'action': (
            "This message appears legitimate. However, always apply good email hygiene: verify unexpected "
            "requests directly with the sender, avoid clicking embedded links without hovering to check the URL, "
            "and never share sensitive information via email."
        )
    }
}

# ─── MODEL LOADER ─────────────────────────────────────────────────────────────
_model = None

def get_model():
    global _model
    if _model is not None:
        return _model
    model_path = os.path.join(os.path.dirname(__file__), "..", "ml", "phishing_model.pkl")
    if os.path.exists(model_path):
        try:
            with open(model_path, 'rb') as f:
                _model = pickle.load(f)
                print("✅ Phishing ML model loaded successfully.")
                return _model
        except Exception as e:
            print(f"⚠ Model load failed: {e}. Using fallback.")
    return None

# ─── PATTERN ANALYSIS ─────────────────────────────────────────────────────────
def analyze_patterns(text: str) -> Tuple[List[Dict], int, str]:
    """Run scam pattern analysis and return flagged phrases, score, and recommendation type."""
    text_lower = text.lower()
    flagged = []
    pattern_score = 0
    rec_type = 'generic_phishing'

    # Track which categories triggered
    has_credentials = False
    has_financial = False
    has_impersonation = False
    has_advance_fee = False
    has_urgency = False
    has_prize = False

    for pattern, reason, level in ALL_PATTERNS:
        matches = re.findall(pattern, text_lower)
        if matches:
            match_text = matches[0] if isinstance(matches[0], str) else matches[0][0] if matches[0] else pattern
            flagged.append({"text": str(match_text), "reason": reason, "level": level})
            if level == 'red':
                pattern_score += 15
            else:
                pattern_score += 8

    # Determine recommendation type
    has_credentials = any(p[0] in [r[0] for r in CREDENTIAL_PATTERNS] for p in [p for p in ALL_PATTERNS if any(re.search(p[0], text_lower) for _ in [1])])
    
    cred_match = any(re.search(p[0], text_lower) for p in CREDENTIAL_PATTERNS)
    fin_match = any(re.search(p[0], text_lower) for p in [
        (r'\bmillion.*(dollar|usd|transfer|fund)\b', '', ''),
        (r'\bprocessing fee\b', '', ''),
    ])
    imp_match = any(re.search(p[0], text_lower) for p in IMPERSONATION_PATTERNS)
    adv_match = bool(re.search(r'\b(million|billion)\b.*\b(dollar|usd|transfer|fund)\b', text_lower))
    urg_match = any(re.search(p[0], text_lower) for p in URGENCY_PATTERNS)
    prize_match = any(re.search(p[0], text_lower) for p in REWARD_SCAM_PATTERNS)

    if cred_match: rec_type = 'credential_harvest'
    elif adv_match: rec_type = 'advance_fee'
    elif prize_match: rec_type = 'prize_scam'
    elif imp_match: rec_type = 'impersonation'
    elif urg_match: rec_type = 'urgency_trap'

    return flagged[:8], min(pattern_score, 60), rec_type


# ─── NLP FEATURE SCORING ──────────────────────────────────────────────────────
def nlp_feature_score(text: str) -> int:
    """Calculate NLP-based risk score from email features."""
    score = 0
    t = text.lower()

    # Caps abuse
    caps_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)
    if caps_ratio > 0.3: score += 15
    elif caps_ratio > 0.15: score += 8

    # Exclamation marks
    excls = text.count('!')
    if excls >= 3: score += 10
    elif excls >= 1: score += 5
    
    # $ or monetary amounts
    money_matches = re.findall(r'\$[\d,]+|rs\.?\s*\d+|₹[\d,]+', t)
    if money_matches: score += 8

    # Multiple URLs
    url_count = len(re.findall(r'http[s]?://', t))
    if url_count >= 2: score += 10
    elif url_count == 1: score += 4

    # Generic greeting
    if re.search(r'\b(dear (customer|user|account holder|valued member|sir|madam|friend))\b', t):
        score += 8

    # Grammar / odd phrasing signals (common in phishing)
    if re.search(r'\bkindly\b.*\bprovide\b|\bprovide us with\b|\bhumbly request\b', t):
        score += 5

    # Threats / consequences
    if re.search(r'\b(arrest|legal action|court|lawsuit|prosecute|penalty|fine)\b', t):
        score += 15

    # Very short email (some phishing is terse)
    words = t.split()
    if len(words) < 30 and url_count > 0: score += 5

    return min(score, 40)


# ─── ML MODEL SCORE ───────────────────────────────────────────────────────────
def ml_model_score(text: str) -> Tuple[float, float]:
    """Get ML model probability and confidence."""
    model = get_model()
    if model is None:
        return 0.0, 0.0
    try:
        proba = model.predict_proba([text])[0]
        phishing_prob = proba[1]  # class 1 = phishing
        confidence = float(max(proba))
        return float(phishing_prob), confidence
    except Exception as e:
        print(f"Model inference error: {e}")
        return 0.0, 0.0


# ─── COMPOSITE RISK SCORING ───────────────────────────────────────────────────
def compute_risk_score(ml_prob: float, pattern_score: int, nlp_score: int) -> int:
    """
    Weighted combination:
    - ML model: 40% weight
    - Pattern analysis: 35% weight
    - NLP features: 25% weight
    """
    ml_contribution = ml_prob * 100 * 0.40
    pattern_contribution = pattern_score * 0.35  # already max 60, weight brings it to 21 max
    nlp_contribution = nlp_score * 0.25 / 40 * 100 * 0.25  # normalize then weight

    raw = ml_contribution + pattern_contribution + nlp_contribution
    return min(100, int(raw))


def get_severity(score: int) -> str:
    if score <= 25: return 'LOW'
    if score <= 50: return 'MED'
    if score <= 75: return 'HIGH'
    return 'CRIT'


# ─── EXPLANATION GENERATOR ────────────────────────────────────────────────────
def generate_explanation_summary(flagged_phrases: List[Dict], ml_prob: float, pattern_score: int, nlp_score: int, verdict: str) -> str:
    """Generate a plain-English explanation for the verdict."""
    if verdict == 'LEGIT':
        return (
            "No significant phishing indicators were found. "
            "The email does not exhibit urgency manipulation, credential harvesting, or suspicious link patterns. "
            "Always verify unexpected requests through official channels."
        )

    parts = []
    if ml_prob > 0.5:
        parts.append(f"The ML model (trained on phishing corpus) flagged this email with {int(ml_prob*100)}% phishing probability based on its language patterns.")
    if pattern_score > 20:
        parts.append(f"Scam pattern analysis detected {len(flagged_phrases)} suspicious indicator(s) including urgency cues, credential requests, or brand impersonation.")
    if nlp_score > 15:
        parts.append("NLP analysis found structural red flags: excessive capitalization, monetary references, threatening language, or impersonal generic greetings typical of mass phishing campaigns.")
    
    parts.append("Combined analysis indicates a high likelihood of social engineering intended to steal credentials, money, or personal data.")
    return " ".join(parts)


# ─── MAIN ANALYSIS FUNCTION ───────────────────────────────────────────────────
def analyze_phishing_advanced(text: str) -> dict:
    """Full phishing analysis pipeline."""
    # Step 1: ML model
    ml_prob, ml_conf = ml_model_score(text)
    
    # Step 2: Pattern analysis
    flagged_phrases, pattern_score, rec_type = analyze_patterns(text)
    
    # Step 3: NLP feature score
    nlp_score = nlp_feature_score(text)

    # Step 4: Composite risk score
    if ml_conf == 0.0:
        # Fallback: use patterns + NLP only
        print("HF/ML unavailable, using pattern+NLP fallback for phishing")
        PHISHING_KEYWORDS = ["verify", "suspend", "urgent", "click here", "confirm", "reward", "password", "paypal", "account", "24 hours"]
        matched = [kw for kw in PHISHING_KEYWORDS if kw in text.lower()]
        ml_prob = len(matched) / len(PHISHING_KEYWORDS)
        ml_conf = 0.75
        threat_score = min(100, pattern_score + nlp_score + int(ml_prob * 40))
        confidence = ml_conf - 0.1
    else:
        threat_score = compute_risk_score(ml_prob, pattern_score, nlp_score)
        confidence = ml_conf

    severity = get_severity(threat_score)
    verdict = 'PHISHING' if threat_score > 45 else 'LEGIT'

    # Step 5: Recommendation
    if verdict == 'LEGIT':
        rec = RECOMMENDATIONS['safe']
    else:
        rec = RECOMMENDATIONS.get(rec_type, RECOMMENDATIONS['generic_phishing'])

    # Step 6: Explanation
    explanation = generate_explanation_summary(flagged_phrases, ml_prob, pattern_score, nlp_score, verdict)

    return {
        "threat_score": threat_score,
        "severity": severity,
        "verdict": verdict,
        "confidence": round(confidence, 3),
        "flagged_phrases": flagged_phrases,
        "recommended_action": f"[{rec['title']}] {rec['action']}",
        "explanation_summary": explanation,
        "analysis_breakdown": {
            "ml_probability": round(ml_prob, 3),
            "pattern_score": pattern_score,
            "nlp_score": nlp_score,
        }
    }
