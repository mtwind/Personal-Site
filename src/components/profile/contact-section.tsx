import type { Contact } from "@/lib/profile-data";
import { GitHubIcon } from "./icons";
import { EmptyState, Section } from "./section";

interface ContactLink {
  label: string;
  href: string;
  display: string;
  icon: React.ReactNode;
}

/** Brand glyph from the official simple-icons path; inherits currentColor
 *  so it follows the theme. The GitHub mark lives in ./icons, shared with
 *  the repo link on project cards. */
function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
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
