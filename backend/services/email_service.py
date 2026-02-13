"""
Email Service using Resend
Handles all transactional emails including referral notifications
"""
import os
import asyncio
import logging
import resend
from dotenv import load_dotenv
from typing import Optional

# Load environment variables
load_dotenv()

# Setup logging
logger = logging.getLogger(__name__)

# Configure Resend
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY
    logger.info("Resend API key configured")
else:
    logger.warning("RESEND_API_KEY not configured - emails will be mocked")


async def send_email(to_email: str, subject: str, html_content: str) -> dict:
    """
    Send an email using Resend API
    Returns status and message/email_id
    """
    if not RESEND_API_KEY:
        logger.info(f"[MOCK EMAIL] To: {to_email}, Subject: {subject}")
        return {"status": "mocked", "message": "Email mocked - API key not configured"}
    
    params = {
        "from": SENDER_EMAIL,
        "to": [to_email],
        "subject": subject,
        "html": html_content
    }
    
    try:
        # Run sync SDK in thread to keep FastAPI non-blocking
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {to_email}: {email.get('id')}")
        return {
            "status": "success",
            "message": f"Email sent to {to_email}",
            "email_id": email.get("id")
        }
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }


# ============== REFERRAL EMAIL TEMPLATES ==============

def get_referral_invite_template(
    inviter_name: str,
    referee_name: str,
    referral_code: str,
    referral_link: str,
    reward_amount: float
) -> str:
    """Generate HTML email template for referral invitation"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background-color: #F3F4F6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F3F4F6; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); padding: 40px; text-align: center;">
                                <h1 style="color: #FFFFFF; margin: 0; font-size: 28px; font-weight: 700;">You're Invited!</h1>
                                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">{inviter_name} thinks you'll love Software Galaxy</p>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                                    Hi{' ' + referee_name if referee_name else ''},
                                </p>
                                <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                                    {inviter_name} has invited you to join Software Galaxy - a powerful platform for managing your business.
                                </p>
                                
                                <!-- Reward Box -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #EEF2FF; border-radius: 12px; margin: 24px 0;">
                                    <tr>
                                        <td style="padding: 24px; text-align: center;">
                                            <p style="color: #6366F1; font-size: 14px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Your Welcome Bonus</p>
                                            <p style="color: #4F46E5; font-size: 36px; font-weight: 700; margin: 0;">${reward_amount}</p>
                                            <p style="color: #6B7280; font-size: 14px; margin: 8px 0 0 0;">Credit when you sign up</p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- CTA Button -->
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="text-align: center; padding: 20px 0;">
                                            <a href="{referral_link}" style="display: inline-block; background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); color: #FFFFFF; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-weight: 600; font-size: 16px;">
                                                Get Started Now
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Referral Code -->
                                <p style="color: #6B7280; font-size: 14px; text-align: center; margin: 20px 0 0 0;">
                                    Or use referral code: <strong style="color: #4F46E5; letter-spacing: 2px;">{referral_code}</strong>
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #F9FAFB; padding: 24px; text-align: center; border-top: 1px solid #E5E7EB;">
                                <p style="color: #9CA3AF; font-size: 13px; margin: 0;">
                                    Software Galaxy - Your Business, Simplified
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


def get_referral_signup_notification_template(
    referrer_name: str,
    referee_name: str,
    reward_amount: float
) -> str:
    """Generate HTML email for when someone signs up using your referral"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background-color: #F3F4F6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F3F4F6; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 40px; text-align: center;">
                                <div style="width: 64px; height: 64px; background-color: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 16px; line-height: 64px;">
                                    <span style="font-size: 32px;">&#127881;</span>
                                </div>
                                <h1 style="color: #FFFFFF; margin: 0; font-size: 28px; font-weight: 700;">Your Friend Joined!</h1>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                                    Hi {referrer_name},
                                </p>
                                <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                                    Great news! <strong>{referee_name}</strong> has signed up using your referral link.
                                </p>
                                
                                <!-- Reward Box -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #D1FAE5; border-radius: 12px; margin: 24px 0;">
                                    <tr>
                                        <td style="padding: 24px; text-align: center;">
                                            <p style="color: #059669; font-size: 14px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">You Earned</p>
                                            <p style="color: #047857; font-size: 36px; font-weight: 700; margin: 0;">${reward_amount}</p>
                                            <p style="color: #6B7280; font-size: 14px; margin: 8px 0 0 0;">Credit added to your account</p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="color: #6B7280; font-size: 14px; line-height: 22px; margin: 20px 0 0 0; text-align: center;">
                                    Keep sharing your referral code to earn more rewards!
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #F9FAFB; padding: 24px; text-align: center; border-top: 1px solid #E5E7EB;">
                                <p style="color: #9CA3AF; font-size: 13px; margin: 0;">
                                    Software Galaxy - Your Business, Simplified
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


def get_referral_milestone_template(
    user_name: str,
    milestone: str,
    total_referrals: int,
    total_earned: float,
    bonus_amount: float = 0
) -> str:
    """Generate HTML email for referral milestones"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background-color: #F3F4F6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F3F4F6; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 40px; text-align: center;">
                                <div style="width: 64px; height: 64px; background-color: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 16px; line-height: 64px;">
                                    <span style="font-size: 32px;">&#127942;</span>
                                </div>
                                <h1 style="color: #FFFFFF; margin: 0; font-size: 28px; font-weight: 700;">Milestone Reached!</h1>
                                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">{milestone}</p>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                                    Congratulations {user_name}!
                                </p>
                                <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                                    You've reached an amazing milestone in our referral program. Your network is growing!
                                </p>
                                
                                <!-- Stats -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                                    <tr>
                                        <td width="50%" style="padding: 16px; text-align: center; background-color: #FEF3C7; border-radius: 12px 0 0 12px;">
                                            <p style="color: #92400E; font-size: 13px; margin: 0 0 4px 0;">Total Referrals</p>
                                            <p style="color: #78350F; font-size: 28px; font-weight: 700; margin: 0;">{total_referrals}</p>
                                        </td>
                                        <td width="50%" style="padding: 16px; text-align: center; background-color: #D1FAE5; border-radius: 0 12px 12px 0;">
                                            <p style="color: #065F46; font-size: 13px; margin: 0 0 4px 0;">Total Earned</p>
                                            <p style="color: #047857; font-size: 28px; font-weight: 700; margin: 0;">${total_earned}</p>
                                        </td>
                                    </tr>
                                </table>
                                
                                {f'''
                                <!-- Bonus -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #EEF2FF; border-radius: 12px; margin: 24px 0;">
                                    <tr>
                                        <td style="padding: 20px; text-align: center;">
                                            <p style="color: #4F46E5; font-size: 14px; margin: 0;">Milestone Bonus: <strong>${bonus_amount}</strong> added to your account!</p>
                                        </td>
                                    </tr>
                                </table>
                                ''' if bonus_amount > 0 else ''}
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #F9FAFB; padding: 24px; text-align: center; border-top: 1px solid #E5E7EB;">
                                <p style="color: #9CA3AF; font-size: 13px; margin: 0;">
                                    Software Galaxy - Your Business, Simplified
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


# ============== HIGH-LEVEL EMAIL FUNCTIONS ==============

async def send_referral_invite_email(
    to_email: str,
    inviter_name: str,
    referee_name: Optional[str],
    referral_code: str,
    referral_link: str,
    reward_amount: float
) -> dict:
    """Send referral invitation email"""
    subject = f"{inviter_name} invited you to Software Galaxy - Get ${reward_amount} credit!"
    html = get_referral_invite_template(
        inviter_name=inviter_name,
        referee_name=referee_name or "",
        referral_code=referral_code,
        referral_link=referral_link,
        reward_amount=reward_amount
    )
    return await send_email(to_email, subject, html)


async def send_referral_signup_notification(
    to_email: str,
    referrer_name: str,
    referee_name: str,
    reward_amount: float
) -> dict:
    """Notify referrer when someone signs up using their code"""
    subject = f"Your friend {referee_name} just joined! You earned ${reward_amount}"
    html = get_referral_signup_notification_template(
        referrer_name=referrer_name,
        referee_name=referee_name,
        reward_amount=reward_amount
    )
    return await send_email(to_email, subject, html)


async def send_referral_milestone_email(
    to_email: str,
    user_name: str,
    milestone: str,
    total_referrals: int,
    total_earned: float,
    bonus_amount: float = 0
) -> dict:
    """Send milestone achievement email"""
    subject = f"Congratulations! You've reached {milestone}"
    html = get_referral_milestone_template(
        user_name=user_name,
        milestone=milestone,
        total_referrals=total_referrals,
        total_earned=total_earned,
        bonus_amount=bonus_amount
    )
    return await send_email(to_email, subject, html)
