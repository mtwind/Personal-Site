import type { Contact } from "@/lib/profile-data";
import { EmptyState, Section } from "./section";

interface ContactLink {
  label: string;
  href: string;
  display: string;
}

function buildLinks(contact: Contact): ContactLink[] {
  const links: ContactLink[] = [];
  if (contact.linkedinUrl) {
    links.push({
      label: "LinkedIn",
      href: contact.linkedinUrl,
      display: contact.linkedinUrl.replace(/^https?:\/\/(www\.)?/, ""),
    });
  }
  if (contact.email) {
    links.push({
      label: "Email",
      href: `mailto:${contact.email}`,
      display: contact.email,
    });
  }
  if (contact.phone && contact.showPhone) {
    links.push({
      label: "Phone",
      href: `tel:${contact.phone}`,
      display: contact.phone,
    });
  }
  if (contact.resumeUrl) {
    links.push({
      label: "Résumé",
      href: contact.resumeUrl,
      display: "Download résumé (PDF)",
    });
  }
  return links;
}

export function ContactView({ contact }: { contact: Contact | null }) {
  const links = contact ? buildLinks(contact) : [];

  if (links.length === 0) {
    return <EmptyState message="No contact details added yet." />;
  }

  return (
    <dl className="mx-auto grid max-w-lg gap-x-10 gap-y-4 sm:grid-cols-2">
      {links.map((link) => (
        <div key={link.label} className="text-center sm:text-left">
          <dt className="font-sans text-[10.5px] font-semibold tracking-[0.22em] text-(--dim) uppercase">
            {link.label}
          </dt>
          <dd className="mt-0.5 min-w-0">
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
