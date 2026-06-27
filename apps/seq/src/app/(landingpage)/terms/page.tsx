export const metadata = {
  title: "Terms of Use",
}

export default function TermsPage() {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-4xl mx-auto">
      <h1 className="scroll-m-20 text-4xl font-semibold tracking-tight text-balance">
        Terms of Use
      </h1>

      <p className="text-sm text-muted-foreground mb-6">Last updated: March 25, 2026.</p>


      <h2 className="mb-2">I. Acceptance of Terms</h2>

      <p className="mb-10">
        By accessing or using <strong>B2C Boilerplate</strong> (the "Service"), you agree to
        these Terms of Use. If you do not agree with any part of these terms, do not use the
        Service.
      </p>


      <h2 className="mb-2">II. Description of Service</h2>

      <p className="mb-10">
        The Service allows users to create accounts, access protected features, and manage
        their personal data. Full access requires registration with a verified email address.
      </p>


      <h2 className="mb-2">III. Registration and User Responsibilities</h2>

      <p className="mb-4">To use the Service, you must:</p>

      <ul className="mb-10">
        <li>Provide true, accurate, and complete information during registration.</li>
        <li>Keep your password confidential.</li>
        <li>Immediately notify us of any unauthorized use of your account.</li>
        <li>Be responsible for all activities carried out with your credentials.</li>
      </ul>


      <h2 className="mb-2">IV. Acceptable Use</h2>

      <p className="mb-4">You agree not to:</p>

      <ul className="mb-10">
        <li>Use the Service for illegal or unauthorized purposes.</li>
        <li>Attempt to access accounts or systems without authorization.</li>
        <li>Interfere with the operation of the Service.</li>
        <li>Transmit harmful, offensive content or content that violates third-party rights.</li>
      </ul>


      <h2 className="mb-2">V. Account Termination</h2>

      <p className="mb-4">
        You may delete your account at any time in the profile settings. Upon deletion, your
        personal data will be permanently removed as described in our Privacy Policy.
      </p>

      <p className="mb-10">
        We reserve the right to suspend or terminate accounts that violate these Terms.
      </p>


      <h2 className="mb-2">VI. Limitation of Liability</h2>

      <p className="mb-10">
        The Service is provided "as is", without warranties of any kind. We are not responsible
        for interruptions, data loss, or indirect damages resulting from use of the Service.
      </p>


      <h2 className="mb-2">VII. Changes to Terms</h2>

      <p className="mb-10">
        We may update these Terms periodically. We will notify users of relevant changes.
        Continued use of the Service after changes constitutes acceptance of the new terms.
      </p>

      <h2 className="mb-2">VIII. Governing Law and Jurisdiction</h2>

      <p className="mb-10">
        These Terms are governed by applicable law. Any disputes shall be resolved in the
        courts of [CITY/STATE].
      </p>


      <h2 className="mb-2">IX. Contact</h2>

      <p className="mb-10">
        Questions about these Terms may be sent to:{" "}
        <a href="mailto:terms@bahien.se">terms@bahien.se</a>
      </p>
    </article>
  )
}
