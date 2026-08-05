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
      label: "Resume",
      href: contact.resumeUrl,
      display: "Download resume (PDF)",
    });
  }
  return links;
}

export function ContactSection({ contact }: { contact: Contact | null }) {
  const links = contact ? buildLinks(contact) : [];

  return (
    <Section id="contact" title="Contact">
      {links.length > 0 ? (
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {links.map((link) => (
            <div key={link.label} className="flex items-baseline gap-3">
              <dt className="w-20 shrink-0 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {link.label}
              </dt>
              <dd className="min-w-0">
                <a
                  href={link.href}
                  target={link.href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="break-all text-sm text-zinc-800 underline-offset-2 hover:underline dark:text-zinc-200"
                >
                  {link.display}
                </a>
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <EmptyState message="No contact details added yet." />
      )}
    </Section>
  );
}
