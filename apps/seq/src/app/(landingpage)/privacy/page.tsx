export const metadata = {
  title: "Privacy Policy",
}

export default function PrivacyPage() {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-4xl mx-auto">
      <h1 className="scroll-m-20 text-4xl font-semibold tracking-tight text-balance">
        Privacy Policy
      </h1>

      <p className="text-sm text-muted-foreground mb-6">Last updated: March 25, 2026</p>

      <p className="mb-10">
        This Privacy Policy describes how <strong>B2C Boilerplate</strong>
        ("we", "our") collects, uses, and protects your personal data.
      </p>


      <h2 className=" mb-2">I. Data Collected</h2>

      <p className=" mb-4">We collect the following data when you create and use your account:</p>

      <ul className=" mb-4">
        <li><strong>Full name</strong> (first and last name)</li>
        <li><strong>Email address</strong></li>
        <li><strong>Password</strong> (stored exclusively as a hash — never in plain text)</li>
        <li><strong>Email verification date</strong></li>
        <li><strong>Account creation and update date</strong></li>
      </ul>

      <p className="mb-10">We do not collect payment, location, device, or browsing behavior data.</p>


      <h2 className=" mb-2">II. Purpose of Processing</h2>

      <p className=" mb-4">We use your data to:</p>

      <ul className=" mb-10">
        <li>Create and maintain your user account.</li>
        <li>Authenticate your access to the Service.</li>
        <li>Send transactional emails (email verification, password reset).</li>
        <li>Ensure account security (login attempt control).</li>
      </ul>


      <h2 className=" mb-2">III. Legal Basis</h2>

      <ul className=" mb-10">
        <li><strong>Contract performance</strong>: data is necessary to provide the contracted Service.</li>
        <li><strong>Legitimate interest</strong>: account security and fraud prevention.</li>
        <li><strong>Consent</strong>: for optional communications, where applicable.</li>
      </ul>


      <h2 className=" mb-2">IV. Data Retention</h2>

      <p className=" mb-10">
        Your data is retained while your account is active. Upon account deletion, all
        personal data is permanently removed from our systems. Temporary tokens (email
        verification, password reset) expire automatically after 1 to 24 hours.
      </p>


      <h2 className=" mb-2">V. Data Sharing</h2>

      <p className=" mb-4">
        We do not sell, rent, or share your personal data with third parties, except:
      </p>

      <ul className=" mb-10">
        <li><strong>Essential service providers</strong>: transactional email service (Resend)
          and cloud database (Neon), bound by confidentiality agreements.</li>
        <li><strong>Legal obligation</strong>: when required by law or court order.</li>
      </ul>


      <h2 className=" mb-2">VI. Your Rights</h2>

      <p className=" mb-4">You have the right to:</p>

      <ul className=" mb-4">
        <li><strong>Access</strong>: view the data we hold about you.</li>
        <li><strong>Correction</strong>: update your name or email directly in your profile.</li>
        <li><strong>Deletion</strong>: delete your account and all associated data.</li>
        <li><strong>Portability</strong>: request a copy of your data in a structured format.</li>
        <li><strong>Withdrawal of consent</strong>: withdraw consent at any time.</li>
        <li><strong>Objection</strong>: object to processing in case of non-compliance.</li>
      </ul>

      <p className=" mb-10">
        To exercise these rights, contact us at the email address in the section below.
        We will respond within 15 days.
      </p>


      <h2 className=" mb-2">VII. Security</h2>
      <p className=" mb-10">
        We adopt technical measures to protect your data: bcrypt password hashing,
        encrypted communication via HTTPS, single-use tokens with expiration,
        and login attempt control.
      </p>


      <h2 className=" mb-2">VIII. Cookies</h2>

      <p className=" mb-4">We use two types of cookies:</p>

      <ul className=" mb-4">
        <li><strong>Essential</strong>: required for authentication and Service operation
          (e.g., NextAuth session cookie). Do not require consent.</li>
        <li><strong>Optional</strong>: analytics or tracking, when configured. Require
          explicit consent.</li>
      </ul>

      <p className=" mb-10">You can manage your cookie preferences at any time in the consent banner.</p>


      <h2 className=" mb-2">IX. Data Controller and DPO</h2>

      <p className=" mb-4">
        Data controller: <strong>[COMPANY NAME]</strong>, registered at [FULL ADDRESS].
      </p>

      <p className=" mb-10">
        Data Protection Officer (DPO): [DPO NAME] —{" "}
        <a href="mailto:privacy@example.com">privacy@example.com</a>
      </p>


      <h2 className=" mb-2">X. Changes to this Policy</h2>

      <p className=" mb-10">
        We may update this Policy periodically. We will notify you by email or in-Service
        notice for relevant changes. Continued use after changes indicates acceptance of the
        new version.
      </p>
    </article>
  )
}
