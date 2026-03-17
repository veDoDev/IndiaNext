"""
AEGIS.AI — Auto Input Type Detector
Analyzes incoming text and determines if it's:
  - Phishing Email
  - Prompt Injection
  - User Behaviour JSON
"""

import re
import json

INJECTION_KEYWORDS = [
    "ignore previous", "you are now", "forget", "DAN", "jailbreak",
    "pretend", "override", "disregard", "act as", "new instructions",
    "ignore all", "system prompt", "roleplay as", "do anything now",
    "no restrictions", "developer mode", "simulate", "bypass",
]

EMAIL_SIGNALS = [
    r'\b(dear|hello|hi)\b.{0,50}\b(customer|user|sir|madam|account holder)\b',
    r'\bsubject:\b',
    r'\bfrom:\b|\bto:\b',
    r'\bgmail|yahoo|outlook|hotmail\b',
    r'\bclick here\b|\bclick the link\b',
    r'\bverify your account\b|\bconfirm your account\b',
    r'\b(paypal|amazon|apple|microsoft|irs|bank)\b.{0,100}\b(account|verify|click)\b',
    r'\b24 hours?\b',
    r'\burgent\b',
    r'\bpassword\b|\bsuspend\b',
]

def detect_input_type(text: str) -> str:
    """Returns: 'phishing' | 'injection' | 'behaviour'"""
    text_lower = text.lower().strip()

    # Check if it's a JSON array (behaviour logs)
    try:
        parsed = json.loads(text)
        if isinstance(parsed, list) and len(parsed) > 0:
            first = parsed[0]
            if isinstance(first, dict) and any(k in first for k in ['timestamp', 'action', 'ip', 'event']):
                return 'behaviour'
    except Exception:
        pass

    # Check for URLs
    # Simple regex to catch standalone URLs or text heavily dominated by URLs
    url_pattern = re.compile(r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+|www\.[-\w.]+')
    urls = url_pattern.findall(text)
    if urls:
        # If the input is primarily just a URL, route to URL analyzer
        text_without_urls = url_pattern.sub('', text).strip()
        if len(text_without_urls) < 20 or len(urls) > 0:
            return 'url'

    # Score for injection
    injection_score = sum(1 for kw in INJECTION_KEYWORDS if kw.lower() in text_lower)
    
    # Score for phishing email
    email_score = sum(1 for pattern in EMAIL_SIGNALS if re.search(pattern, text_lower))

    if injection_score >= 2 and injection_score > email_score:
        return 'injection'
    elif email_score >= 2:
        return 'phishing'
    elif injection_score >= 1:
        return 'injection'
    else:
        # Default to phishing for general suspicious text
        return 'phishing'
