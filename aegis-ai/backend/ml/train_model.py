"""
AEGIS.AI — Phishing Detection ML Training Script
Trains a Logistic Regression classifier on a comprehensive embedded phishing dataset.
Datasets simulated from patterns across:
  - Enron Spam Dataset
  - SpamAssassin Public Corpus
  - Nazario Phishing Corpus
  - Nigerian/419 Scam patterns
  - Brand-impersonation phishing patterns (PayPal, Amazon, Bank, Apple, Netflix, etc.)
  - Legitimate transactional email patterns
"""

import os
import pickle
import re
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# ─── TRAINING DATA ───────────────────────────────────────────────────────────
# Label: 1 = Phishing, 0 = Legitimate

PHISHING_EMAILS = [
    # PayPal phishing
    "Dear Customer, Your PayPal account has been limited. Verify your information immediately by clicking here to restore access. Failure to comply within 24 hours will result in permanent suspension.",
    "URGENT: Your PayPal account is at risk. Click here to confirm your identity and secure your account now. Ignore this at your own peril.",
    "Action Required: Suspicious activity detected on your PayPal account. Please verify your password and banking details to avoid suspension.",
    "PayPal Alert: We've detected unusual login attempts. Login immediately to confirm your account. Click to verify: http://paypal-secure-verify.tk",
    
    # Bank phishing
    "Dear Valued Customer, Your bank account has been suspended due to suspicious activity. Provide your SSN and account number to reactivate it.",
    "ALERT: Your bank account will be closed. Call us immediately or click the link to verify your account details and avoid closure.",
    "Security Notice: Unauthorized access to your account has been detected. Confirm your identity by entering your full name, account number and PIN.",
    "Important: Your bank has flagged your account. Please update your credit card information via the secure link to restore full access.",
    
    # Amazon phishing
    "Your Amazon order has been placed on hold. Please verify your payment information to ensure delivery. Click here to update billing details.",
    "Amazon Security Alert: Someone tried to access your account from an unknown device. Confirm your account now or it will be locked.",
    "Congratulations! You have won a $1000 Amazon gift card. Click here to claim your prize and verify your address for shipping.",
    
    # IRS/Tax scam
    "IRS Notice: You owe $3,241 in unpaid taxes. Failure to pay immediately will result in arrest. Call this number or click here to pay.",
    "Tax Refund Available: The IRS has processed your tax return. Click here to claim your $850 refund by entering your bank account details.",
    "Final Warning from IRS: Legal action will be taken against you within 24 hours. Settle your tax debt by clicking this secure link.",

    # Nigerian scam / inheritance
    "Dear Friend, I am the widow of a late oil mogul from Nigeria. I wish to transfer $15 million USD to your account for safekeeping. I need your account details. You will receive 30% of the amount.",
    "Good day, I am a barrister and I write to you regarding an urgent business proposition. My late client has left $8.5 million unclaimed. I need your assistance to transfer these funds.",
    "I am Prince Emmanuel from Sierra Leone. I need a trustworthy partner to help transfer funds out of my country. I will reward you generously.",
    
    # Microsoft/IT support scam
    "Microsoft Support: Your computer has been infected with a virus. Call our toll-free number immediately to prevent permanent data loss.",
    "Warning: Your Windows license has expired. Your PC is at risk of being hacked. Click here to renew your subscription now.",
    "Your computer sent us an error report. Our technicians detected a problem. Click here to run our free security scan.",
    
    # Generic phishing
    "URGENT: Your account requires immediate attention. Click the link below to verify your information or your account will be permanently deleted in 24 hours.",
    "Congratulations! You have been selected for a special reward. Confirm your shipping address and pay a small processing fee to receive your gift.",
    "Dear user, we noticed you haven't updated your password in over 90 days. Click here to reset your password and secure your account immediately.",
    "Your free trial has expired. Update your payment details to continue using the service. Failure to do so will result in data loss.",
    "FINAL NOTICE: You have an unpaid invoice of $299. Immediate payment is required to avoid legal proceedings. Click here to pay now.",
    "Your account password will expire in 24 hours. Click here to create a new password to maintain access to your account.",
    "Verify your email address now to avoid losing access to your account. Click the link below within 30 minutes.",
    "Security alert: Someone accessed your account from a new location. Click here immediately to secure your account.",
    "You have a pending refund of $500. To claim your money, please verify your bank account information by clicking this link.",
    "Dear account holder, we are updating our records. Please provide your full name, date of birth, and social security number.",
    "WIN A PRIZE: You have been selected to receive $5,000 cash. Reply with your name, address, and phone number to claim.",
    "FREE GIFT CARD: Complete a brief survey and claim a $200 gift card. Hurry, offer expires today!",
    "Your Netflix subscription payment failed. Update your payment method immediately to avoid losing access.",
    "Apple ID locked. Your Apple ID has been disabled for security reasons. Click here to unlock your account.",
    "Your package could not be delivered. Provide your address and pay a $2.99 redelivery fee to receive your package.",
    "ACTION REQUIRED: Confirm your email or your account will be suspended in 48 hours.",
    "HSBC Bank: Your online banking access has been blocked. Please call us immediately or click here to restore access.",
    "Dropbox: You have a pending shared document. Sign in to view and confirm your account details.",
    "LinkedIn: Your account has been temporarily suspended due to suspicious activity. Login to verify your identity.",
    "Phishing test: Click here to verify your login credentials for the company system immediately.",
    "Your Google account was used to sign in from a new device. If this wasn't you, click here to secure your account immediately.",
    "Your password was recently changed. If you did not change your password click here to recover your account.",
    "NOTICE: Unusual login from Russia. Confirm this was you or click here to lock your account now.",
    "Your Coinbase wallet has been flagged for suspicious activity. Verify your identity to unlock your wallet.",
    "Income tax refund of Rs 7,829 is pending in your account. Confirm your bank details at this link to receive your refund.",
    "You owe electricity bill payment of Rs 1,450. Your connection will be discontinued tonight. Pay now.",
]

LEGITIMATE_EMAILS = [
    # Transactional
    "Your order #12345 has been shipped. Your package is on its way and will arrive by Thursday. Track it here.",
    "Thank you for your purchase. Your receipt for $45.99 is attached to this email for your records.",
    "Your monthly statement is ready to view. Log in to your account to see your balance and recent transactions.",
    "Your subscription has been renewed. Thank you for being a loyal customer. Your next billing date is April 15.",
    "Meeting reminder: Project sync scheduled for tomorrow at 10:00 AM. Please join using the meeting link.",
    "Your flight booking is confirmed. Check-in opens 24 hours before departure. View your itinerary here.",
    
    # Professional
    "Hi team, please find attached the quarterly report. Let me know if you have any questions or feedback.",
    "As discussed in our meeting, I am sending over the updated project timeline. Please review and let me know.",
    "Thank you for attending our webinar. Here is a recording of the session for your reference.",
    "Your application for the position has been received. Our HR team will contact you within 5 business days.",
    "Welcome to our newsletter! You subscribed to receive updates about our products and promotions.",
    "Our office will be closed on Monday for the national holiday. Normal operations resume Tuesday.",
    
    # System notifications
    "Your password change was successful. If you did not make this change, contact support immediately.",
    "Your two-factor authentication setup is complete. Your account is now more secure.",
    "Your account has been created. Welcome! Please check your inbox to verify your email address.",
    "Your download is ready. Click here to access your file. The link expires in 72 hours.",
    "We have received your support ticket. Our team will get back to you within 2 business days.",
    "Your profile has been updated successfully. The changes will take effect immediately.",
    
    # Newsletters/Marketing (legitimate)
    "This month's top picks just for you. Check out our latest arrivals with exclusive member discounts.",
    "Your weekly digest is ready. Here are the top stories curated just for you based on your interests.",
    "Reminder: Your free trial ends in 7 days. You can upgrade anytime from your account settings.",
    "New features are available in your account. Here is what is new and how to get started.",
    "Thank you for completing our survey. Your feedback helps us improve our products and services.",
    
    # HR/Office
    "Please submit your timesheet by Friday 5pm. HR will process payroll over the weekend.",
    "Performance review season begins next week. Please complete your self-assessment form beforehand.",
    "Team lunch this Friday at 1pm. Please RSVP so we can make the reservation. Location: The Grand Cafe.",
    "Your expense report has been approved. Reimbursement will be processed in the next payroll cycle.",
    "Reminder: All hands meeting this Tuesday at 3pm in Conference Room B. Agenda attached.",
    
    # More varied legitimate
    "Your library book is due in 3 days. Return or renew to avoid late fees.",
    "Parking permit renewal is due next month. Visit the city portal to renew online.",
    "Your health insurance card has been mailed to your address on file. Allow 7-10 days for delivery.",
    "Your appointment has been confirmed for March 20 at 2:30 PM. Please arrive 10 minutes early.",
    "Congratulations on completing the training module. Your certificate is available for download.",
    "Your GitHub pull request has been approved. You can merge it now.",
    "The document you shared has been edited by your colleague. View the latest version.",
    "Your domain name will expire in 30 days. Renew to keep your website online.",
    "Invoice #INV-2024-0042 from Vendor XYZ for services rendered. Amount: $1,200.00. Due: March 30.",
    "Taxes are due April 15th. File online through the official government tax portal.",
]

def build_dataset():
    texts = PHISHING_EMAILS + LEGITIMATE_EMAILS
    labels = [1] * len(PHISHING_EMAILS) + [0] * len(LEGITIMATE_EMAILS)
    return texts, labels

def extract_features(text):
    """Extract additional handcrafted features for phishing detection."""
    t = text.lower()
    features = {
        "urgency_words": len(re.findall(r'\b(urgent|immediately|now|asap|expire|suspend|limited|24 hours|48 hours|final notice|pending|at risk)\b', t)),
        "action_words": len(re.findall(r'\b(click|verify|confirm|update|provide|call|pay|login|sign in|submit|claim)\b', t)),
        "threat_words": len(re.findall(r'\b(suspend|block|cancel|close|delete|arrest|legal action|penalty|consequence)\b', t)),
        "reward_words": len(re.findall(r'\b(win|won|reward|prize|gift|free|congratulations|selected|bonus|refund)\b', t)),
        "financial_words": len(re.findall(r'\b(account|bank|credit card|password|ssn|social security|routing|paypal|transfer|funds|wire)\b', t)),
        "url_count": len(re.findall(r'http[s]?://|www\.', t)),
        "suspicious_domains": len(re.findall(r'\b(\.tk|\.ru|\.cc|\.xyz|verify-|secure-|update-|login-|account-)\b', t)),
        "dollar_amounts": len(re.findall(r'\$[\d,]+|\d+ dollars|₹[\d,]+|rs\.?\s*\d+', t)),
        "exclamation_count": text.count('!'),
        "caps_ratio": sum(1 for c in text if c.isupper()) / max(len(text), 1),
        "question_marks": text.count('?'),
        "personal_info_request": len(re.findall(r'\b(name|address|phone|date of birth|ssn|pin|otp|cvv|account number)\b', t)),
    }
    return list(features.values())

def train_and_save():
    texts, labels = build_dataset()

    # TF-IDF Logistic Regression pipeline
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            ngram_range=(1, 2),
            max_features=3000,
            strip_accents='unicode',
            analyzer='word',
            min_df=1,
        )),
        ('clf', LogisticRegression(
            C=2.0,
            max_iter=500,
            class_weight='balanced',
            solver='lbfgs',
        )),
    ])

    X_train, X_test, y_train, y_test = train_test_split(texts, labels, test_size=0.2, random_state=42, stratify=labels)
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    print("\n=== Model Evaluation ===")
    print(classification_report(y_test, y_pred, target_names=['Legitimate', 'Phishing']))

    model_path = os.path.join(os.path.dirname(__file__), "phishing_model.pkl")
    with open(model_path, 'wb') as f:
        pickle.dump(pipeline, f)
    print(f"\n✅ Model saved to {model_path}")
    return pipeline

if __name__ == "__main__":
    train_and_save()
