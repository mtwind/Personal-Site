import type { Contact } from "@/lib/profile-data";
import { EmptyState, Section } from "./section";

interface ContactLink {
  label: string;
  href: string;
  display: string;
  icon: React.ReactNode;
}

/** Brand glyphs use the official simple-icons paths; both inherit
 *  currentColor so they follow the theme. */
function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
      <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
      <path d="M21 16.5v3a1.9 1.9 0 0 1-2.1 1.9 19.6 19.6 0 0 1-8.5-3 19.2 19.2 0 0 1-5.9-5.9 19.6 19.6 0 0 1-3-8.5A1.9 1.9 0 0 1 3.4 2h3a1.9 1.9 0 0 1 1.9 1.6c.12.92.35 1.82.68 2.68a1.9 1.9 0 0 1-.43 2L7.3 9.5a15.2 15.2 0 0 0 5.9 5.9l1.22-1.25a1.9 1.9 0 0 1 2-.43c.86.33 1.76.56 2.68.68A1.9 1.9 0 0 1 21 16.5z" />
    </svg>
  );
}

function ResumeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
      <path d="M14 2.5H6a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-11z" />
      <path d="M14 2.5v6h6" />
      <path d="M8.5 13h7M8.5 17h5" />
    </svg>
  );
}

function buildLinks(contact: Contact): ContactLink[] {
  const links: ContactLink[] = [];
  if (contact.linkedinUrl) {
    links.push({
      label: "LinkedIn",
      href: contact.linkedinUrl,
      display: contact.linkedinUrl.replace(/^https?:\/\/(www\.)?/, ""),
      icon: <LinkedInIcon />,
    });
  }
  if (contact.githubUrl) {
    links.push({
      label: "GitHub",
      href: contact.githubUrl,
      display: contact.githubUrl.replace(/^https?:\/\/(www\.)?/, ""),
      icon: <GitHubIcon />,
    });
  }
  if (contact.email) {
    links.push({
      label: "Email",
      href: `mailto:${contact.email}`,
      display: contact.email,
      icon: <EmailIcon />,
    });
  }
  if (contact.phone && contact.showPhone) {
    links.push({
      label: "Phone",
      href: `tel:${contact.phone}`,
      display: contact.phone,
      icon: <PhoneIcon />,
    });
  }
  if (contact.resumeUrl) {
    links.push({
      label: "Résumé",
      href: contact.resumeUrl,
      display: "Download résumé (PDF)",
      icon: <ResumeIcon />,
    });
  }
  return links;
}

export function ContactView({ contact }: { contact: Contact | null }) {
  const links = contact ? buildLinks(contact) : [];

  if (links.length === 0) {
    return <EmptyState message="No contact details added yet." />;
  }

  // w-fit + auto columns: the block hugs its content, so mx-auto centers
  // the actual links rather than a fixed-width box.
  return (
    <dl className="mx-auto grid w-fit gap-x-14 gap-y-4 sm:grid-cols-[auto_auto]">
      {links.map((link) => (
        <div key={link.label} className="text-center sm:text-left">
          <dt className="flex items-center justify-center gap-2 font-sans text-[10.5px] font-semibold tracking-[0.22em] text-(--dim) uppercase sm:justify-start">
            <span className="text-(--accent)" aria-hidden>
              {link.icon}
            </span>
            {link.label}
          </dt>
          <dd className="mt-0.5 min-w-0 sm:pl-6">
            <a
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="text-[15px] break-all text-(--title) underline-offset-3 transition-colors duration-200 hover:text-(--accent) hover:underline"
            >
              {link.display}
            </a>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ContactSection({ contact }: { contact: Contact | null }) {
  return (
    <Section id="contact" title="Contact">
      <ContactView contact={contact} />
    </Section>
  );
}
