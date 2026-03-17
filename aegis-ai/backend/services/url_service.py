import os
import requests
import re
from typing import Tuple
from models.schemas import AnalyzeTextResponse, FlaggedPhrase
from dotenv import load_dotenv

load_dotenv()
HF_API_TOKEN = os.getenv("HF_API_TOKEN")

# Suspicious URL indicators for rule-based detection
SUSPICIOUS_TLDS = [".xyz", ".top", ".loan", ".win", ".club", ".stream", ".gq", ".ml", ".cf", ".tk", ".ga", ".ru", ".cn"]
URL_SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly", "adf.ly", "bit.do", "cutt.ly"]
DANGEROUS_KEYWORDS = ["login", "verify", "secure", "account", "update", "bank", "paypal", "admin", "free", "gift"]

def get_severity_from_score(score: int) -> str:
    if score <= 25: return "LOW"
    if score <= 50: return "MED"
    if score <= 75: return "HIGH"
    return "CRIT"

def analyze_url(url: str) -> AnalyzeTextResponse:
    # URL extraction if text contains more than just the URL
    extracted_url = url
    url_match = re.search(r'(https?://[^\s]+)', url)
    if url_match:
        extracted_url = url_match.group(1)
        
    API_URL = "https://api-inference.huggingface.co/models/elftsdmr/malware-url-detect"
    headers = {"Authorization": f"Bearer {HF_API_TOKEN}"} if HF_API_TOKEN else {}
    
    fallback_used = False
    score = 0
    confidence = 0.0
    
    if HF_API_TOKEN:
        try:
            response = requests.post(API_URL, headers=headers, json={"inputs": extracted_url}, timeout=10)
            if response.status_code == 200:
                result = response.json()
                if isinstance(result, list) and isinstance(result[0], list):
                    res = result[0]
                elif isinstance(result, list) and isinstance(result[0], dict):
                    res = result
                else:
                    fallback_used = True
                    res = []
                
                if not fallback_used and res:
                    # Model outputs typically 'LABEL_1' (malicious) or 'LABEL_0' (benign)
                    malicious_score = next((item['score'] for item in res if item['label'].upper() in ['MALICIOUS', 'LABEL_1', '1', 'PHISHING', 'MALWARE', 'DEFACEMENT']), 0.0)
                    confidence = max(item['score'] for item in res)
                    score = int(malicious_score * 100)
            else:
                fallback_used = True
        except Exception as e:
            print(f"HF URL API Error: {e}")
            fallback_used = True
    else:
        fallback_used = True
        
    flagged = []
    
    # ─── FALLBACK: RULE-BASED URL ANALYSIS ───
    if fallback_used:
        print("Using rule-based URL detection fallback.")
        url_lower = extracted_url.lower()
        
        # Check TLDs
        if any(tld in url_lower for tld in SUSPICIOUS_TLDS):
            score += 40
            flagged.append(FlaggedPhrase(text=extracted_url, reason="Suspicious Top-Level Domain (TLD) associated with spam/malware.", level="red"))
            
        # Check Shorteners
        if any(shortener in url_lower for shortener in URL_SHORTENERS):
            score += 30
            flagged.append(FlaggedPhrase(text=extracted_url, reason="URL Shortener hides the actual destination.", level="amber"))
            
        # Check IP-based URLs
        if re.search(r'https?://\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', url_lower):
            score += 50
            flagged.append(FlaggedPhrase(text=extracted_url, reason="Direct IP address in URL instead of domain name.", level="red"))
            
        # Check multiple subdomains / long URLs
        if len(url_lower) > 75 or url_lower.count('.') > 3:
            score += 20
            flagged.append(FlaggedPhrase(text=extracted_url, reason="Unusually long URL or excessive subdomains (obfuscation attempt).", level="amber"))
            
        # Check dangerous keywords in path/subdomain
        for kw in DANGEROUS_KEYWORDS:
            if kw in url_lower:
                score += 15
                flagged.append(FlaggedPhrase(text=kw, reason="High-risk keyword found in URL path or subdomain.", level="amber"))
                
        score = min(score, 100)
        confidence = 0.85
        
    severity = get_severity_from_score(score)
    verdict = "MALICIOUS" if score > 50 else "SAFE"
    
    # Ensure flagged phrases exist if verdict is malicious via ML
    if not fallback_used and score > 50 and not flagged:
         flagged.append(FlaggedPhrase(text=extracted_url[:30]+"...", reason="HuggingFace model detected structural similarities to known malicious domains.", level="red"))
         
    if verdict == "MALICIOUS":
        action = "DO NOT CLICK. Block this domain in your firewall/proxy. Do not enter credentials or download files."
    else:
        action = "URL appears safe, but always verify the domain matches the expected brand name before entering credentials."

    return AnalyzeTextResponse(
        threat_score=score,
        severity=severity,
        verdict=verdict,
        confidence=confidence,
        flagged_phrases=flagged[:5], # Keep it concise
        recommended_action=action,
        engine_source="HuggingFace URL Model" if not fallback_used else "Local Rule Engine"
    )
