"""
Legal Policy Templates for KwikPay
Multi-jurisdiction compliant Terms of Service, Privacy Policy, and AML Policy
"""
from datetime import datetime
from typing import Dict, Any

COMPANY_NAME = "KwikPay"
COMPANY_LEGAL_NAME = "KwikPay Technologies Ltd"
COMPANY_ADDRESS = "Dar es Salaam, Tanzania"
EFFECTIVE_DATE = "January 1, 2025"
SUPPORT_EMAIL = "support@kwikpay.com"
LEGAL_EMAIL = "legal@kwikpay.com"
DPO_EMAIL = "privacy@kwikpay.com"


def get_terms_of_service(merchant_name: str = None, country_code: str = "TZ") -> Dict[str, Any]:
    """Generate Terms of Service document"""
    
    country_specific = {
        "TZ": {
            "regulator": "Bank of Tanzania (BOT)",
            "currency": "Tanzanian Shillings (TZS)",
            "jurisdiction": "United Republic of Tanzania",
            "data_protection_law": "Tanzania Data Protection Act, 2022",
            "consumer_protection_law": "Tanzania Fair Competition Act"
        },
        "KE": {
            "regulator": "Central Bank of Kenya (CBK)",
            "currency": "Kenyan Shillings (KES)",
            "jurisdiction": "Republic of Kenya",
            "data_protection_law": "Kenya Data Protection Act, 2019",
            "consumer_protection_law": "Consumer Protection Act, 2012"
        },
        "UG": {
            "regulator": "Bank of Uganda (BOU)",
            "currency": "Ugandan Shillings (UGX)",
            "jurisdiction": "Republic of Uganda",
            "data_protection_law": "Data Protection and Privacy Act, 2019",
            "consumer_protection_law": "Consumer Protection Bill"
        },
        "RW": {
            "regulator": "National Bank of Rwanda (BNR)",
            "currency": "Rwandan Francs (RWF)",
            "jurisdiction": "Republic of Rwanda",
            "data_protection_law": "Law N°058/2021 relating to the Protection of Personal Data",
            "consumer_protection_law": "Law on Consumer Protection"
        },
        "GH": {
            "regulator": "Bank of Ghana (BOG)",
            "currency": "Ghanaian Cedis (GHS)",
            "jurisdiction": "Republic of Ghana",
            "data_protection_law": "Data Protection Act, 2012 (Act 843)",
            "consumer_protection_law": "Consumer Protection Regulations"
        },
        "NG": {
            "regulator": "Central Bank of Nigeria (CBN)",
            "currency": "Nigerian Naira (NGN)",
            "jurisdiction": "Federal Republic of Nigeria",
            "data_protection_law": "Nigeria Data Protection Regulation (NDPR) 2019",
            "consumer_protection_law": "Federal Competition and Consumer Protection Act, 2018"
        }
    }
    
    country = country_specific.get(country_code, country_specific["TZ"])
    
    return {
        "title": f"{COMPANY_NAME} Merchant Terms of Service",
        "effective_date": EFFECTIVE_DATE,
        "last_updated": datetime.utcnow().strftime("%B %d, %Y"),
        "jurisdiction": country["jurisdiction"],
        "sections": [
            {
                "number": "1",
                "title": "INTRODUCTION AND ACCEPTANCE",
                "content": f"""
1.1 Agreement Overview
These Terms of Service ("Agreement") constitute a legally binding contract between you ("Merchant," "you," or "your") and {COMPANY_LEGAL_NAME} ("{COMPANY_NAME}," "we," "us," or "our"), a company registered and operating in {country["jurisdiction"]}.

1.2 Acceptance of Terms
By registering for, accessing, or using {COMPANY_NAME} payment processing services, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree to these Terms, you must not use our services.

1.3 Eligibility
To use {COMPANY_NAME} services, you must:
(a) Be at least 18 years of age or the age of legal majority in your jurisdiction;
(b) Have the legal capacity to enter into binding contracts;
(c) Be a registered business entity or sole proprietor operating legally in {country["jurisdiction"]};
(d) Maintain valid business registration and tax identification documents;
(e) Comply with all applicable laws, rules, and regulations regarding your business operations.

1.4 Changes to Terms
We reserve the right to modify these Terms at any time. We will notify you of material changes via email or through our platform at least thirty (30) days before they take effect. Your continued use of our services after such notice constitutes acceptance of the modified Terms.
"""
            },
            {
                "number": "2",
                "title": "SERVICES DESCRIPTION",
                "content": f"""
2.1 Payment Processing Services
{COMPANY_NAME} provides the following payment processing services:
(a) Card payment acceptance (Visa, Mastercard, and other supported networks);
(b) QR code payment processing;
(c) Mobile money integration (M-Pesa, Airtel Money, Tigo Pesa, and other supported providers);
(d) Bank transfer processing;
(e) Payment link generation and management;
(f) Transaction reporting and analytics;
(g) Settlement and payout services.

2.2 Service Availability
We strive to maintain 99.9% service availability. However, services may be temporarily unavailable due to:
(a) Scheduled maintenance (with advance notice);
(b) Emergency system updates;
(c) Force majeure events;
(d) Third-party service provider outages;
(e) Regulatory requirements.

2.3 Integration Methods
Merchants may integrate {COMPANY_NAME} services through:
(a) Web-based checkout pages;
(b) API integration (subject to separate API Terms);
(c) Mobile SDK integration;
(d) Point-of-sale terminal applications;
(e) Payment links and QR codes.

2.4 Supported Currencies
Primary settlement currency: {country["currency"]}
Cross-border transactions may be subject to currency conversion at prevailing exchange rates plus applicable fees.
"""
            },
            {
                "number": "3",
                "title": "MERCHANT OBLIGATIONS",
                "content": f"""
3.1 Account Security
You are responsible for:
(a) Maintaining the confidentiality of your account credentials;
(b) Implementing appropriate security measures for your systems;
(c) Immediately notifying us of any unauthorized access;
(d) Ensuring all users authorized to access your account comply with these Terms.

3.2 Compliance Requirements
You agree to:
(a) Comply with all applicable laws and regulations in {country["jurisdiction"]};
(b) Maintain valid business licenses and permits;
(c) Comply with Payment Card Industry Data Security Standard (PCI DSS);
(d) Adhere to card network rules and regulations;
(e) Implement appropriate anti-fraud measures;
(f) Cooperate with regulatory inquiries and audits.

3.3 Prohibited Activities
You shall not:
(a) Process transactions for illegal goods or services;
(b) Engage in money laundering or terrorist financing;
(c) Process transactions that violate card network rules;
(d) Use the services for personal, family, or household purposes;
(e) Sublicense or resell our services without authorization;
(f) Circumvent any security or fraud prevention measures;
(g) Process transactions for high-risk activities without prior approval.

3.4 Prohibited Business Types
The following business types are prohibited from using {COMPANY_NAME} services:
(a) Adult entertainment and pornography;
(b) Gambling and betting (without proper licensing);
(c) Weapons and ammunition;
(d) Controlled substances and illegal drugs;
(e) Counterfeit or pirated goods;
(f) Multi-level marketing schemes;
(g) Unlicensed financial services;
(h) Any business prohibited by law in {country["jurisdiction"]}.

3.5 Documentation and Verification
You must:
(a) Complete Know Your Customer (KYC) verification;
(b) Provide accurate and current business information;
(c) Submit required documentation within specified timeframes;
(d) Notify us of material changes to your business within 7 days;
(e) Maintain records as required by applicable law.
"""
            },
            {
                "number": "4",
                "title": "FEES AND SETTLEMENT",
                "content": f"""
4.1 Transaction Fees
(a) Transaction fees are charged as a percentage of each successful transaction;
(b) Current fee schedules are provided in your merchant agreement;
(c) Fees may vary based on payment method, transaction volume, and risk profile;
(d) We reserve the right to modify fees with thirty (30) days' notice.

4.2 Settlement Terms
(a) Standard settlement: Funds are transferred within 1-3 business days after transaction date;
(b) Settlement frequency: Daily, weekly, or monthly as agreed;
(c) Minimum settlement amount: As specified in your merchant agreement;
(d) Settlement is made in {country["currency"]} to your designated bank account.

4.3 Reserves and Holdbacks
We may hold a reserve from your settlements if:
(a) Your chargeback rate exceeds acceptable thresholds;
(b) There are concerns about fraudulent activity;
(c) Your business is deemed high-risk;
(d) Regulatory requirements mandate such reserves.

4.4 Chargebacks and Disputes
(a) You are responsible for all chargebacks and related fees;
(b) Chargeback fees are deducted from your settlement;
(c) Excessive chargebacks may result in account suspension or termination;
(d) You must respond to chargeback notifications within specified timeframes;
(e) We will provide reasonable assistance in disputing invalid chargebacks.

4.5 Refunds
(a) You may issue refunds through the {COMPANY_NAME} platform;
(b) Refunds must be processed within the timeframe required by card networks;
(c) Original transaction fees are not refunded for refunded transactions;
(d) Partial refunds are supported subject to system capabilities.
"""
            },
            {
                "number": "5",
                "title": "DATA PROTECTION AND PRIVACY",
                "content": f"""
5.1 Data Collection
We collect and process data in accordance with the {country["data_protection_law"]} and our Privacy Policy, including:
(a) Merchant business information;
(b) Transaction data;
(c) Customer payment information (processed securely);
(d) Technical and usage data.

5.2 Data Security
We implement industry-standard security measures including:
(a) PCI DSS Level 1 compliance;
(b) Encryption of sensitive data in transit and at rest;
(c) Regular security audits and penetration testing;
(d) Access controls and monitoring;
(e) Incident response procedures.

5.3 Data Retention
(a) Transaction records: Retained for 7 years as required by law;
(b) KYC documents: Retained for 5 years after account closure;
(c) Technical logs: Retained for 90 days;
(d) Marketing data: Retained until consent is withdrawn.

5.4 Your Obligations
You agree to:
(a) Comply with all applicable data protection laws;
(b) Obtain necessary consents from your customers;
(c) Implement appropriate security measures;
(d) Notify us immediately of any data breaches;
(e) Cooperate with data subject access requests.
"""
            },
            {
                "number": "6",
                "title": "INTELLECTUAL PROPERTY",
                "content": f"""
6.1 {COMPANY_NAME} Property
All intellectual property rights in {COMPANY_NAME} services, including but not limited to:
(a) Software and source code;
(b) Trademarks, logos, and branding;
(c) Documentation and training materials;
(d) APIs and technical specifications;
remain the exclusive property of {COMPANY_LEGAL_NAME}.

6.2 License Grant
We grant you a limited, non-exclusive, non-transferable license to use {COMPANY_NAME} services and associated materials solely for processing payments in accordance with these Terms.

6.3 Restrictions
You may not:
(a) Copy, modify, or create derivative works;
(b) Reverse engineer or decompile our software;
(c) Remove or alter any proprietary notices;
(d) Use our trademarks without prior written consent;
(e) Sublicense any rights granted herein.

6.4 Feedback
Any feedback, suggestions, or improvements you provide may be used by us without obligation or compensation to you.
"""
            },
            {
                "number": "7",
                "title": "LIMITATION OF LIABILITY",
                "content": f"""
7.1 Exclusion of Damages
TO THE MAXIMUM EXTENT PERMITTED BY LAW, {COMPANY_NAME.upper()} SHALL NOT BE LIABLE FOR:
(a) Indirect, incidental, special, consequential, or punitive damages;
(b) Loss of profits, revenue, data, or business opportunities;
(c) Service interruptions or delays;
(d) Third-party claims against you;
(e) Unauthorized access to or alteration of your transmissions or data.

7.2 Cap on Liability
OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS SHALL NOT EXCEED THE LESSER OF:
(a) The fees paid by you to {COMPANY_NAME} in the twelve (12) months preceding the claim; or
(b) Ten thousand United States Dollars (USD 10,000).

7.3 Essential Purpose
The limitations in this section shall apply regardless of the form of action, whether in contract, tort, strict liability, or otherwise, and even if we have been advised of the possibility of such damages.

7.4 Regulatory Liability
Nothing in these Terms limits our liability for fraud, gross negligence, or willful misconduct, or any liability that cannot be excluded by law.
"""
            },
            {
                "number": "8",
                "title": "INDEMNIFICATION",
                "content": f"""
8.1 Your Indemnification Obligations
You agree to indemnify, defend, and hold harmless {COMPANY_LEGAL_NAME}, its officers, directors, employees, agents, and affiliates from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising out of or relating to:
(a) Your breach of these Terms;
(b) Your violation of any applicable law or regulation;
(c) Your products or services;
(d) Any dispute between you and your customers;
(e) Your negligent or wrongful acts or omissions;
(f) Any claim that your use of our services infringes third-party rights.

8.2 Indemnification Procedure
We will:
(a) Promptly notify you of any claim;
(b) Provide reasonable cooperation in the defense;
(c) Allow you to control the defense and settlement, provided any settlement does not adversely affect us without our consent.
"""
            },
            {
                "number": "9",
                "title": "TERM AND TERMINATION",
                "content": f"""
9.1 Term
This Agreement is effective upon your acceptance and continues until terminated by either party.

9.2 Termination by Merchant
You may terminate this Agreement at any time by:
(a) Providing thirty (30) days' written notice;
(b) Settling all outstanding obligations;
(c) Ceasing to use our services.

9.3 Termination by {COMPANY_NAME}
We may terminate or suspend your account:
(a) Immediately for breach of these Terms;
(b) Immediately for suspected fraud or illegal activity;
(c) Immediately if required by law or regulation;
(d) With thirty (30) days' notice for any other reason.

9.4 Effect of Termination
Upon termination:
(a) Your access to services will be discontinued;
(b) Outstanding fees and obligations remain payable;
(c) We will settle any funds owed to you, less applicable reserves;
(d) Data retention obligations continue as specified;
(e) Provisions that by nature should survive will survive termination.

9.5 Reserve Release
Any reserves held will be released within ninety (90) days after termination, subject to:
(a) Resolution of pending chargebacks;
(b) Completion of any investigations;
(c) Satisfaction of all outstanding obligations.
"""
            },
            {
                "number": "10",
                "title": "DISPUTE RESOLUTION",
                "content": f"""
10.1 Governing Law
This Agreement shall be governed by and construed in accordance with the laws of {country["jurisdiction"]}, without regard to conflict of law principles.

10.2 Informal Resolution
Before initiating formal proceedings, parties agree to attempt to resolve disputes through good faith negotiation for a period of thirty (30) days.

10.3 Arbitration
Any dispute not resolved informally shall be submitted to binding arbitration in accordance with the rules of the arbitration center in {country["jurisdiction"]}. The arbitration shall be conducted in English, and the decision shall be final and binding.

10.4 Jurisdiction
For matters not subject to arbitration, the courts of {country["jurisdiction"]} shall have exclusive jurisdiction.

10.5 Class Action Waiver
You agree to bring claims only in your individual capacity and not as a plaintiff or class member in any purported class or representative proceeding.

10.6 Time Limitation
Any claim arising out of or relating to these Terms must be filed within one (1) year after the claim arose.
"""
            },
            {
                "number": "11",
                "title": "GENERAL PROVISIONS",
                "content": f"""
11.1 Entire Agreement
This Agreement, together with any schedules, exhibits, and policies incorporated by reference, constitutes the entire agreement between the parties regarding its subject matter.

11.2 Severability
If any provision of this Agreement is held invalid or unenforceable, the remaining provisions shall continue in full force and effect.

11.3 Waiver
Our failure to enforce any right or provision shall not constitute a waiver of such right or provision.

11.4 Assignment
You may not assign this Agreement without our prior written consent. We may assign our rights and obligations to any affiliate or successor entity.

11.5 Force Majeure
Neither party shall be liable for delays or failures due to circumstances beyond their reasonable control, including natural disasters, war, terrorism, strikes, or government actions.

11.6 Notices
All notices shall be in writing and delivered to:
{COMPANY_NAME}: {LEGAL_EMAIL}
Merchant: Your registered email address

11.7 Relationship
Nothing in this Agreement creates a partnership, joint venture, agency, or employment relationship between the parties.

11.8 Third-Party Beneficiaries
This Agreement does not confer any rights on third parties, except for indemnified parties as specified herein.
"""
            },
            {
                "number": "12",
                "title": "REGULATORY COMPLIANCE",
                "content": f"""
12.1 Regulatory Authority
{COMPANY_NAME} operates under the supervision of {country["regulator"]} and complies with all applicable payment services regulations.

12.2 License Information
Our payment services are provided under applicable licenses and authorizations as required by {country["jurisdiction"]} law.

12.3 Consumer Protection
Merchants must comply with {country["consumer_protection_law"]} and provide clear information to customers regarding:
(a) Pricing and fees;
(b) Refund and return policies;
(c) Product or service descriptions;
(d) Terms of sale.

12.4 Reporting Requirements
You agree to cooperate with any regulatory reporting requirements, including suspicious activity reports and transaction monitoring.

12.5 Audit Rights
We and regulatory authorities reserve the right to audit your compliance with these Terms and applicable regulations.
"""
            }
        ],
        "contact_information": {
            "general_inquiries": SUPPORT_EMAIL,
            "legal_matters": LEGAL_EMAIL,
            "data_protection": DPO_EMAIL,
            "address": COMPANY_ADDRESS
        },
        "acceptance_statement": f"""
BY CLICKING "I ACCEPT" OR BY USING {COMPANY_NAME.upper()} SERVICES, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE.

If you are accepting on behalf of a business entity, you represent and warrant that you have the authority to bind such entity to these Terms.
"""
    }


def get_privacy_policy(country_code: str = "TZ") -> Dict[str, Any]:
    """Generate Privacy Policy document"""
    
    country_specific = {
        "TZ": {
            "jurisdiction": "United Republic of Tanzania",
            "data_protection_law": "Tanzania Data Protection Act, 2022",
            "regulator": "Tanzania Data Protection Commission",
            "cross_border_rules": "Data transfers outside Tanzania require adequate protection measures"
        },
        "KE": {
            "jurisdiction": "Republic of Kenya",
            "data_protection_law": "Kenya Data Protection Act, 2019",
            "regulator": "Office of the Data Protection Commissioner",
            "cross_border_rules": "Data transfers require consent and adequate protection"
        },
        "UG": {
            "jurisdiction": "Republic of Uganda",
            "data_protection_law": "Data Protection and Privacy Act, 2019",
            "regulator": "Personal Data Protection Office",
            "cross_border_rules": "Cross-border transfers require adequate safeguards"
        },
        "RW": {
            "jurisdiction": "Republic of Rwanda",
            "data_protection_law": "Law N°058/2021 relating to the Protection of Personal Data",
            "regulator": "National Cyber Security Authority",
            "cross_border_rules": "International transfers subject to adequacy requirements"
        },
        "GH": {
            "jurisdiction": "Republic of Ghana",
            "data_protection_law": "Data Protection Act, 2012 (Act 843)",
            "regulator": "Data Protection Commission",
            "cross_border_rules": "Transfers require adequate level of protection"
        },
        "NG": {
            "jurisdiction": "Federal Republic of Nigeria",
            "data_protection_law": "Nigeria Data Protection Regulation (NDPR) 2019",
            "regulator": "National Information Technology Development Agency (NITDA)",
            "cross_border_rules": "International transfers require adequacy assessment"
        }
    }
    
    country = country_specific.get(country_code, country_specific["TZ"])
    
    return {
        "title": f"{COMPANY_NAME} Privacy Policy",
        "effective_date": EFFECTIVE_DATE,
        "last_updated": datetime.utcnow().strftime("%B %d, %Y"),
        "jurisdiction": country["jurisdiction"],
        "sections": [
            {
                "number": "1",
                "title": "INTRODUCTION",
                "content": f"""
1.1 About This Policy
This Privacy Policy explains how {COMPANY_LEGAL_NAME} ("{COMPANY_NAME}," "we," "us," or "our") collects, uses, discloses, and protects personal information when you use our payment processing services.

1.2 Scope
This Policy applies to:
(a) Merchants who use {COMPANY_NAME} services;
(b) End customers who make payments through {COMPANY_NAME};
(c) Visitors to our website and applications;
(d) Business contacts and prospective customers.

1.3 Legal Basis
We process personal data in compliance with {country["data_protection_law"]} and applicable data protection regulations in {country["jurisdiction"]}.

1.4 Data Controller
{COMPANY_LEGAL_NAME}
{COMPANY_ADDRESS}
Data Protection Officer: {DPO_EMAIL}
"""
            },
            {
                "number": "2",
                "title": "INFORMATION WE COLLECT",
                "content": f"""
2.1 Merchant Information
When you register as a merchant, we collect:
(a) Business Information: Company name, registration number, tax ID, business address, industry type;
(b) Identity Information: Director/owner names, national ID numbers, dates of birth;
(c) Contact Information: Email addresses, phone numbers, physical addresses;
(d) Financial Information: Bank account details, payment history;
(e) KYC Documentation: Identity documents, business registration certificates, utility bills.

2.2 Transaction Data
For each transaction processed, we collect:
(a) Transaction amount and currency;
(b) Date and time of transaction;
(c) Payment method used;
(d) Transaction status and reference numbers;
(e) Device and browser information;
(f) IP addresses and location data.

2.3 Customer Payment Information
When end customers make payments, we process:
(a) Payment card details (encrypted and tokenized);
(b) Mobile money account information;
(c) Bank account details for transfers;
(d) Billing address information;
(e) Device identifiers for fraud prevention.

2.4 Technical Data
We automatically collect:
(a) Browser type and version;
(b) Operating system;
(c) Device type and identifiers;
(d) IP address and approximate location;
(e) Access times and referring URLs;
(f) Pages viewed and features used.

2.5 Communication Data
We retain records of:
(a) Support tickets and inquiries;
(b) Email correspondence;
(c) Phone call recordings (where permitted);
(d) Chat transcripts.
"""
            },
            {
                "number": "3",
                "title": "HOW WE USE YOUR INFORMATION",
                "content": f"""
3.1 Primary Purposes
We use personal information to:
(a) Provide payment processing services;
(b) Verify identity and conduct KYC checks;
(c) Process settlements and payouts;
(d) Detect and prevent fraud;
(e) Comply with legal and regulatory obligations;
(f) Communicate about your account and services.

3.2 Legal Bases for Processing
We process data based on:
(a) Contract Performance: To fulfill our service agreement with you;
(b) Legal Obligation: To comply with laws, regulations, and court orders;
(c) Legitimate Interests: For fraud prevention, security, and business operations;
(d) Consent: For marketing communications and optional features.

3.3 Fraud Prevention
We use automated systems and manual review to:
(a) Analyze transaction patterns;
(b) Detect suspicious activities;
(c) Verify customer identities;
(d) Prevent unauthorized transactions;
(e) Report suspicious activities to authorities.

3.4 Service Improvement
We analyze aggregated data to:
(a) Improve our platform and services;
(b) Develop new features;
(c) Optimize system performance;
(d) Conduct market research (using anonymized data).

3.5 Marketing Communications
With your consent, we may send:
(a) Product updates and new features;
(b) Industry news and insights;
(c) Promotional offers;
(d) Event invitations.
You can opt out at any time.
"""
            },
            {
                "number": "4",
                "title": "INFORMATION SHARING",
                "content": f"""
4.1 Service Providers
We share information with trusted third parties who assist in:
(a) Payment processing (card networks, banks, mobile money providers);
(b) Identity verification and KYC services;
(c) Fraud detection and prevention;
(d) Cloud hosting and data storage;
(e) Customer support services;
(f) Analytics and reporting.

All service providers are contractually bound to protect your data.

4.2 Card Networks and Banks
Transaction data is shared with:
(a) Visa, Mastercard, and other card networks;
(b) Issuing and acquiring banks;
(c) Payment processors;
to authorize and settle transactions.

4.3 Legal and Regulatory Disclosure
We may disclose information:
(a) When required by law, regulation, or court order;
(b) To regulatory authorities such as {country["regulator"]};
(c) To law enforcement agencies investigating crimes;
(d) To protect our rights and property;
(e) In connection with legal proceedings.

4.4 Business Transfers
In the event of a merger, acquisition, or asset sale, personal information may be transferred to the acquiring entity.

4.5 With Your Consent
We may share information for other purposes with your explicit consent.

4.6 No Sale of Data
We do not sell personal information to third parties for their marketing purposes.
"""
            },
            {
                "number": "5",
                "title": "INTERNATIONAL DATA TRANSFERS",
                "content": f"""
5.1 Cross-Border Processing
To provide our services, we may transfer data outside {country["jurisdiction"]} to:
(a) Process international transactions;
(b) Use global payment networks;
(c) Store data with cloud service providers;
(d) Access services from our group companies.

5.2 Transfer Safeguards
{country["cross_border_rules"]}

We ensure adequate protection through:
(a) Standard contractual clauses;
(b) Binding corporate rules;
(c) Transfers to jurisdictions with adequate protection;
(d) Your explicit consent where required.

5.3 Notification
We will inform you of any international transfers and the safeguards in place.
"""
            },
            {
                "number": "6",
                "title": "DATA RETENTION",
                "content": f"""
6.1 Retention Periods
We retain personal information for:
(a) Active Account Data: Duration of the business relationship plus 7 years;
(b) Transaction Records: 7 years from transaction date (as required by law);
(c) KYC Documents: 5 years after account closure;
(d) Technical Logs: 90 days;
(e) Marketing Preferences: Until consent is withdrawn;
(f) Support Records: 3 years from resolution.

6.2 Retention Basis
Retention periods are determined by:
(a) Legal and regulatory requirements;
(b) Statute of limitations for legal claims;
(c) Business operational needs;
(d) Industry standards.

6.3 Secure Deletion
When data is no longer required, we:
(a) Securely delete electronic records;
(b) Shred physical documents;
(c) Anonymize data retained for analytics;
(d) Request deletion from service providers.
"""
            },
            {
                "number": "7",
                "title": "DATA SECURITY",
                "content": f"""
7.1 Technical Measures
We implement comprehensive security controls:
(a) Encryption of data in transit (TLS 1.3) and at rest (AES-256);
(b) PCI DSS Level 1 compliance for card data;
(c) Multi-factor authentication;
(d) Intrusion detection and prevention systems;
(e) Regular vulnerability assessments and penetration testing;
(f) Secure software development practices.

7.2 Organizational Measures
Our security program includes:
(a) Security policies and procedures;
(b) Employee background checks and training;
(c) Access controls based on least privilege;
(d) Incident response procedures;
(e) Business continuity and disaster recovery plans;
(f) Regular security audits.

7.3 Breach Notification
In the event of a data breach, we will:
(a) Notify affected individuals without undue delay;
(b) Report to {country["regulator"]} as required;
(c) Take immediate steps to contain the breach;
(d) Provide information about protective measures.

7.4 Your Role
You are responsible for:
(a) Maintaining secure login credentials;
(b) Using secure networks;
(c) Reporting suspicious activity;
(d) Implementing appropriate security at your end.
"""
            },
            {
                "number": "8",
                "title": "YOUR RIGHTS",
                "content": f"""
8.1 Access Rights
You have the right to:
(a) Access your personal data we hold;
(b) Receive a copy of your data in a portable format;
(c) Know how your data is being used.

8.2 Correction Rights
You can request:
(a) Correction of inaccurate data;
(b) Completion of incomplete data;
(c) Updates to outdated information.

8.3 Deletion Rights
You may request deletion of your data when:
(a) It is no longer necessary for the original purpose;
(b) You withdraw consent (where consent was the basis);
(c) The data was unlawfully processed;
Subject to legal retention requirements.

8.4 Restriction and Objection
You can:
(a) Restrict processing in certain circumstances;
(b) Object to processing based on legitimate interests;
(c) Object to direct marketing at any time.

8.5 Withdrawal of Consent
Where processing is based on consent, you may withdraw consent at any time without affecting the lawfulness of prior processing.

8.6 Exercising Your Rights
To exercise your rights, contact us at:
Email: {DPO_EMAIL}
We will respond within 30 days.

8.7 Complaints
You have the right to lodge a complaint with {country["regulator"]} if you believe your rights have been violated.
"""
            },
            {
                "number": "9",
                "title": "COOKIES AND TRACKING",
                "content": f"""
9.1 Types of Cookies
We use:
(a) Essential Cookies: Required for platform functionality;
(b) Analytical Cookies: To understand usage patterns;
(c) Functional Cookies: To remember preferences;
(d) Marketing Cookies: For targeted advertising (with consent).

9.2 Cookie Management
You can manage cookies through:
(a) Browser settings;
(b) Our cookie preference center;
(c) Third-party opt-out tools.

9.3 Do Not Track
We honor Do Not Track browser signals where technically feasible.

9.4 Third-Party Analytics
We use analytics services like Google Analytics. You can opt out using browser extensions or privacy settings.
"""
            },
            {
                "number": "10",
                "title": "SPECIAL CATEGORIES",
                "content": f"""
10.1 Children's Privacy
Our services are not directed to individuals under 18. We do not knowingly collect personal information from minors.

10.2 Sensitive Data
We do not intentionally collect sensitive personal data such as:
(a) Racial or ethnic origin;
(b) Political opinions;
(c) Religious beliefs;
(d) Health information;
(e) Sexual orientation;
unless required for specific legitimate purposes.

10.3 Automated Decision-Making
We use automated systems for:
(a) Fraud detection and prevention;
(b) Transaction risk scoring;
You have the right to request human review of automated decisions that significantly affect you.
"""
            },
            {
                "number": "11",
                "title": "CHANGES TO THIS POLICY",
                "content": f"""
11.1 Updates
We may update this Privacy Policy to reflect changes in our practices or legal requirements. Material changes will be communicated via:
(a) Email notification;
(b) Platform announcements;
(c) Updated posting on our website.

11.2 Review
We recommend reviewing this Policy periodically to stay informed about our data practices.

11.3 Effective Date
Changes become effective upon posting unless a later date is specified.
"""
            },
            {
                "number": "12",
                "title": "CONTACT US",
                "content": f"""
12.1 Data Protection Officer
For privacy-related inquiries:
Email: {DPO_EMAIL}

12.2 General Inquiries
{COMPANY_LEGAL_NAME}
{COMPANY_ADDRESS}
Email: {SUPPORT_EMAIL}

12.3 Response Time
We aim to respond to all inquiries within 5 business days and fulfill rights requests within 30 days.
"""
            }
        ],
        "consent_statement": f"""
By using {COMPANY_NAME} services, you acknowledge that you have read and understood this Privacy Policy. Where required, we will obtain your explicit consent for specific processing activities.
"""
    }


def get_aml_policy(country_code: str = "TZ") -> Dict[str, Any]:
    """Generate Anti-Money Laundering (AML) Policy document"""
    
    country_specific = {
        "TZ": {
            "jurisdiction": "United Republic of Tanzania",
            "aml_law": "Anti-Money Laundering Act, 2006 (as amended)",
            "regulator": "Financial Intelligence Unit (FIU)",
            "reporting_threshold": "TZS 10,000,000"
        },
        "KE": {
            "jurisdiction": "Republic of Kenya",
            "aml_law": "Proceeds of Crime and Anti-Money Laundering Act, 2009",
            "regulator": "Financial Reporting Centre (FRC)",
            "reporting_threshold": "KES 1,000,000"
        },
        "UG": {
            "jurisdiction": "Republic of Uganda",
            "aml_law": "Anti-Money Laundering Act, 2013",
            "regulator": "Financial Intelligence Authority (FIA)",
            "reporting_threshold": "UGX 20,000,000"
        },
        "RW": {
            "jurisdiction": "Republic of Rwanda",
            "aml_law": "Law N°54/2011 relating to the Prevention and Fight against Money Laundering",
            "regulator": "Financial Intelligence Unit",
            "reporting_threshold": "RWF 10,000,000"
        },
        "GH": {
            "jurisdiction": "Republic of Ghana",
            "aml_law": "Anti-Money Laundering Act, 2008 (Act 749) as amended",
            "regulator": "Financial Intelligence Centre (FIC)",
            "reporting_threshold": "GHS 50,000"
        },
        "NG": {
            "jurisdiction": "Federal Republic of Nigeria",
            "aml_law": "Money Laundering (Prohibition) Act, 2011 (as amended 2022)",
            "regulator": "Nigerian Financial Intelligence Unit (NFIU)",
            "reporting_threshold": "NGN 5,000,000"
        }
    }
    
    country = country_specific.get(country_code, country_specific["TZ"])
    
    return {
        "title": f"{COMPANY_NAME} Anti-Money Laundering (AML) & Counter-Terrorist Financing (CTF) Policy",
        "effective_date": EFFECTIVE_DATE,
        "last_updated": datetime.utcnow().strftime("%B %d, %Y"),
        "jurisdiction": country["jurisdiction"],
        "classification": "INTERNAL - CONFIDENTIAL",
        "sections": [
            {
                "number": "1",
                "title": "POLICY STATEMENT AND PURPOSE",
                "content": f"""
1.1 Commitment
{COMPANY_LEGAL_NAME} ("{COMPANY_NAME}") is committed to the highest standards of Anti-Money Laundering (AML) and Counter-Terrorist Financing (CTF) compliance. This policy establishes the framework for detecting, preventing, and reporting money laundering and terrorist financing activities.

1.2 Legal Framework
This policy is developed in compliance with:
(a) {country["aml_law"]};
(b) Financial Action Task Force (FATF) Recommendations;
(c) Payment Card Industry (PCI) requirements;
(d) International sanctions regimes;
(e) Regulatory guidance from {country["regulator"]}.

1.3 Scope
This policy applies to:
(a) All employees, officers, and directors of {COMPANY_NAME};
(b) Third-party service providers and agents;
(c) All business units and operations;
(d) All products and services offered;
(e) All customer relationships and transactions.

1.4 Zero Tolerance
{COMPANY_NAME} maintains a zero-tolerance policy towards money laundering and terrorist financing. Violations may result in:
(a) Immediate termination of employment or business relationship;
(b) Reporting to law enforcement and regulatory authorities;
(c) Civil and criminal penalties.
"""
            },
            {
                "number": "2",
                "title": "GOVERNANCE AND RESPONSIBILITIES",
                "content": f"""
2.1 Board of Directors
The Board is responsible for:
(a) Approving the AML/CTF policy and program;
(b) Ensuring adequate resources for compliance;
(c) Receiving regular compliance reports;
(d) Setting the compliance culture from the top.

2.2 Money Laundering Reporting Officer (MLRO)
The MLRO is responsible for:
(a) Overseeing the AML/CTF compliance program;
(b) Reviewing and filing Suspicious Activity Reports (SARs);
(c) Liaising with {country["regulator"]} and law enforcement;
(d) Reporting to the Board on AML matters;
(e) Ensuring staff training and awareness;
(f) Conducting periodic risk assessments.

2.3 Compliance Department
The Compliance team is responsible for:
(a) Implementing AML/CTF policies and procedures;
(b) Conducting customer due diligence;
(c) Monitoring transactions;
(d) Investigating alerts and suspicious activities;
(e) Maintaining AML records.

2.4 All Employees
Every employee must:
(a) Understand and comply with this policy;
(b) Complete required AML training;
(c) Report suspicious activities to the MLRO;
(d) Maintain confidentiality of AML investigations;
(e) Cooperate with compliance reviews.

2.5 Three Lines of Defense
(a) First Line: Business units - own and manage risks;
(b) Second Line: Compliance - oversee and advise;
(c) Third Line: Internal Audit - independent assurance.
"""
            },
            {
                "number": "3",
                "title": "RISK ASSESSMENT",
                "content": f"""
3.1 Enterprise Risk Assessment
We conduct comprehensive risk assessments covering:
(a) Customer risk factors;
(b) Product and service risks;
(c) Geographic risks;
(d) Delivery channel risks;
(e) Transaction risks.

3.2 Customer Risk Categories
HIGH RISK:
(a) Politically Exposed Persons (PEPs) and their associates;
(b) Customers from high-risk jurisdictions;
(c) Cash-intensive businesses;
(d) Money Service Businesses;
(e) Non-face-to-face customers;
(f) Complex corporate structures;
(g) Customers with adverse media.

MEDIUM RISK:
(a) Small and medium enterprises;
(b) Customers from moderate-risk jurisdictions;
(c) Non-PEP customers in regulated industries.

LOW RISK:
(a) Established businesses with clear ownership;
(b) Government entities;
(c) Publicly listed companies;
(d) Regulated financial institutions.

3.3 Product Risk Assessment
Higher risk products include:
(a) International transfers;
(b) High-value transactions;
(c) Anonymous payment methods;
(d) Virtual currency services.

3.4 Geographic Risk
We assess countries based on:
(a) FATF mutual evaluation reports;
(b) Corruption Perception Index;
(c) Sanctions lists;
(d) Local regulatory guidance.

3.5 Risk Mitigation
For higher risks, we implement:
(a) Enhanced due diligence;
(b) More frequent monitoring;
(c) Senior management approval;
(d) Transaction limits;
(e) Periodic reviews.
"""
            },
            {
                "number": "4",
                "title": "CUSTOMER DUE DILIGENCE (CDD)",
                "content": f"""
4.1 Know Your Customer (KYC) Requirements
All customers must undergo KYC verification including:

4.2 Individual Verification
(a) Full legal name;
(b) Date of birth;
(c) Nationality;
(d) Residential address;
(e) Government-issued ID (verified);
(f) Source of funds (where applicable).

4.3 Business Verification
(a) Legal business name and trading names;
(b) Business registration documents;
(c) Tax identification number;
(d) Registered and operating addresses;
(e) Nature of business;
(f) Ownership structure;
(g) Directors and authorized signatories;
(h) Ultimate Beneficial Owners (25%+ ownership);
(i) Source of funds and expected transaction patterns.

4.4 Beneficial Ownership
We identify all Ultimate Beneficial Owners (UBOs):
(a) Individuals owning 25% or more of the business;
(b) Individuals controlling the business;
(c) Senior managing officials if no owner identified;
(d) Verify identity of all UBOs.

4.5 Verification Methods
(a) Document verification (government IDs, certificates);
(b) Electronic verification databases;
(c) Video verification for non-face-to-face customers;
(d) Third-party verification services;
(e) Physical verification where required.

4.6 Enhanced Due Diligence (EDD)
EDD is required for high-risk customers:
(a) Detailed source of funds documentation;
(b) Source of wealth verification;
(c) Senior management approval;
(d) More frequent reviews;
(e) Additional verification measures;
(f) Site visits where appropriate.

4.7 Simplified Due Diligence (SDD)
SDD may apply to low-risk customers:
(a) Government entities;
(b) Listed companies;
(c) Regulated financial institutions;
Subject to no suspicious indicators.

4.8 Ongoing Due Diligence
(a) Periodic review of customer information;
(b) Transaction monitoring;
(c) Updates to risk assessment;
(d) Re-verification of expired documents.
"""
            },
            {
                "number": "5",
                "title": "TRANSACTION MONITORING",
                "content": f"""
5.1 Monitoring Program
We maintain comprehensive transaction monitoring:
(a) Real-time transaction screening;
(b) Post-transaction analysis;
(c) Pattern detection algorithms;
(d) Rule-based alerts;
(e) Machine learning models.

5.2 Red Flags and Indicators
Suspicious indicators include:
(a) Transactions inconsistent with customer profile;
(b) Unusual transaction patterns or volumes;
(c) Structuring to avoid reporting thresholds;
(d) Transactions with high-risk jurisdictions;
(e) Rapid movement of funds;
(f) Use of multiple accounts without business justification;
(g) Reluctance to provide information;
(h) Transactions involving shell companies;
(i) Round-number transactions;
(j) Transactions just below reporting thresholds.

5.3 Reporting Threshold
Cash transactions exceeding {country["reporting_threshold"]} must be reported to {country["regulator"]}.

5.4 Alert Investigation
All alerts are:
(a) Reviewed within 24-48 hours;
(b) Investigated by trained analysts;
(c) Escalated to MLRO if suspicious;
(d) Documented with investigation findings;
(e) Closed with appropriate disposition.

5.5 Transaction Blocking
We may block or delay transactions:
(a) Pending investigation;
(b) Matching sanctions lists;
(c) Exceeding risk thresholds;
(d) At regulator instruction.
"""
            },
            {
                "number": "6",
                "title": "SANCTIONS SCREENING",
                "content": f"""
6.1 Sanctions Programs
We screen against:
(a) UN Security Council sanctions;
(b) US OFAC sanctions lists;
(c) EU sanctions lists;
(d) UK sanctions lists;
(e) Local sanctions ({country["jurisdiction"]});
(f) Other applicable sanctions regimes.

6.2 Screening Points
Screening occurs at:
(a) Customer onboarding;
(b) Transaction processing;
(c) Periodic batch screening;
(d) Upon list updates.

6.3 Screening Coverage
We screen:
(a) Customer names and aliases;
(b) Directors and UBOs;
(c) Counterparties;
(d) Geographic locations;
(e) Vessel names (where applicable).

6.4 Match Handling
Potential matches are:
(a) Reviewed immediately;
(b) True matches blocked and reported;
(c) False positives documented and cleared;
(d) Escalated to MLRO for guidance.

6.5 Prohibited Transactions
We do not process transactions:
(a) Involving sanctioned persons or entities;
(b) To/from sanctioned countries;
(c) Involving sanctioned goods or services;
(d) That would violate any applicable sanctions.
"""
            },
            {
                "number": "7",
                "title": "SUSPICIOUS ACTIVITY REPORTING",
                "content": f"""
7.1 Internal Reporting
Employees must report suspicious activities:
(a) Immediately to the MLRO;
(b) Using internal reporting forms;
(c) With all relevant details;
(d) Without alerting the customer (tipping off prohibition).

7.2 Suspicious Activity Reports (SARs)
The MLRO will file SARs with {country["regulator"]} when:
(a) There is knowledge or suspicion of money laundering;
(b) Terrorist financing is suspected;
(c) Transactions involve proceeds of crime;
(d) Required by law or regulation.

7.3 SAR Contents
SARs include:
(a) Subject identification;
(b) Description of suspicious activity;
(c) Transaction details;
(d) Reason for suspicion;
(e) Supporting documentation.

7.4 Filing Timeline
SARs are filed:
(a) Within 3 business days for urgent matters;
(b) Within 15 business days for other matters;
(c) As otherwise required by regulation.

7.5 Tipping Off Prohibition
It is STRICTLY PROHIBITED to:
(a) Inform the customer about a SAR;
(b) Disclose the existence of an investigation;
(c) Prejudice any investigation;
Violation is a criminal offense.

7.6 Record Retention
SAR records are retained for:
(a) Minimum 5 years from filing;
(b) Longer if investigation is ongoing;
(c) Securely and confidentially.
"""
            },
            {
                "number": "8",
                "title": "POLITICALLY EXPOSED PERSONS (PEPs)",
                "content": f"""
8.1 PEP Definition
Politically Exposed Persons include:
(a) Heads of state or government;
(b) Senior politicians and party officials;
(c) Senior government officials;
(d) Senior judicial officials;
(e) Senior military officials;
(f) Senior executives of state-owned enterprises;
(g) Important political party officials;
(h) International organization officials.

8.2 Family and Associates
PEP status extends to:
(a) Immediate family members (spouse, children, parents, siblings);
(b) Close associates and business partners;
(c) Legal persons controlled by PEPs.

8.3 PEP Handling
For PEP relationships:
(a) Senior management approval required;
(b) Enhanced due diligence mandatory;
(c) Source of funds and wealth verified;
(d) Enhanced monitoring implemented;
(e) Annual review conducted.

8.4 PEP Screening
We use:
(a) Commercial PEP databases;
(b) Public records and media;
(c) Customer declarations;
(d) Regular rescreening.

8.5 Domestic PEPs
Domestic PEPs in {country["jurisdiction"]} are subject to:
(a) Risk-based approach;
(b) Enhanced measures where high risk;
(c) Same requirements as foreign PEPs in higher risk situations.
"""
            },
            {
                "number": "9",
                "title": "RECORD KEEPING",
                "content": f"""
9.1 Records to Maintain
We retain:
(a) Customer identification records;
(b) Transaction records;
(c) Account files and business correspondence;
(d) Risk assessments;
(e) Monitoring alerts and investigations;
(f) SARs and related documentation;
(g) Training records;
(h) Policy and procedure documents.

9.2 Retention Periods
(a) Transaction records: 7 years from transaction date;
(b) Customer records: 5 years after relationship ends;
(c) SAR records: 5 years from filing;
(d) Training records: Duration of employment plus 5 years.

9.3 Record Accessibility
Records must be:
(a) Readily retrievable;
(b) Available to regulators and law enforcement;
(c) Maintained securely;
(d) Protected from unauthorized access.

9.4 Electronic Records
Electronic records must:
(a) Be tamper-proof;
(b) Maintain audit trails;
(c) Be backed up regularly;
(d) Be readable throughout retention period.
"""
            },
            {
                "number": "10",
                "title": "TRAINING AND AWARENESS",
                "content": f"""
10.1 Training Requirements
All relevant staff receive:
(a) Initial AML training upon hiring;
(b) Annual refresher training;
(c) Role-specific training;
(d) Updates on regulatory changes.

10.2 Training Content
Training covers:
(a) Legal and regulatory framework;
(b) Company policies and procedures;
(c) Customer due diligence;
(d) Recognizing suspicious activity;
(e) Reporting procedures;
(f) Sanctions compliance;
(g) Record keeping requirements;
(h) Consequences of non-compliance.

10.3 Training Records
We maintain records of:
(a) Training attendance;
(b) Training materials;
(c) Assessment results;
(d) Certifications.

10.4 Board and Senior Management
Board and senior management receive:
(a) AML awareness briefings;
(b) Regulatory updates;
(c) Risk assessment summaries;
(d) Compliance reports.
"""
            },
            {
                "number": "11",
                "title": "INDEPENDENT TESTING AND AUDIT",
                "content": f"""
11.1 Internal Audit
Internal audit conducts:
(a) Annual AML program review;
(b) Testing of controls;
(c) Sample transaction reviews;
(d) Policy compliance assessments.

11.2 External Audit
Independent external reviews:
(a) Conducted every 2-3 years;
(b) By qualified AML professionals;
(c) Covering all program elements;
(d) Results reported to Board.

11.3 Regulatory Examinations
We cooperate fully with:
(a) {country["regulator"]} examinations;
(b) Central bank inspections;
(c) Law enforcement inquiries;
(d) International regulatory requests.

11.4 Remediation
Audit findings are:
(a) Tracked and prioritized;
(b) Remediated within agreed timelines;
(c) Reported to management;
(d) Verified upon completion.
"""
            },
            {
                "number": "12",
                "title": "POLICY REVIEW AND UPDATES",
                "content": f"""
12.1 Review Frequency
This policy is reviewed:
(a) Annually at minimum;
(b) Upon significant regulatory changes;
(c) Following material incidents;
(d) At Board direction.

12.2 Update Process
Updates require:
(a) Compliance department review;
(b) MLRO approval;
(c) Board approval for material changes;
(d) Communication to all staff.

12.3 Version Control
All policy versions are:
(a) Dated and numbered;
(b) Archived for retention period;
(c) Changes documented;
(d) Distribution tracked.

12.4 Effectiveness
Policy Effective Date: {EFFECTIVE_DATE}
Last Review Date: {datetime.utcnow().strftime("%B %d, %Y")}
Next Review Due: Annual

12.5 Contact
For questions about this policy, contact:
MLRO: {LEGAL_EMAIL}
Compliance: {SUPPORT_EMAIL}
"""
            }
        ],
        "approval_statement": f"""
This Anti-Money Laundering and Counter-Terrorist Financing Policy has been approved by the Board of Directors of {COMPANY_LEGAL_NAME}.

Compliance with this policy is mandatory for all employees, officers, directors, and third parties acting on behalf of {COMPANY_NAME}.
"""
    }


def generate_policy_document(policy_type: str, country_code: str = "TZ", merchant_name: str = None) -> Dict[str, Any]:
    """Generate a specific policy document"""
    if policy_type == "terms_of_service":
        return get_terms_of_service(merchant_name, country_code)
    elif policy_type == "privacy_policy":
        return get_privacy_policy(country_code)
    elif policy_type == "aml_policy":
        return get_aml_policy(country_code)
    else:
        raise ValueError(f"Unknown policy type: {policy_type}")


def get_all_policies(country_code: str = "TZ", merchant_name: str = None) -> Dict[str, Any]:
    """Get all legal policies for a jurisdiction"""
    return {
        "terms_of_service": get_terms_of_service(merchant_name, country_code),
        "privacy_policy": get_privacy_policy(country_code),
        "aml_policy": get_aml_policy(country_code),
        "generated_at": datetime.utcnow().isoformat(),
        "country_code": country_code
    }
