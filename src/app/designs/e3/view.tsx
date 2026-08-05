"use client";

import { useState } from "react";

import { DesignSwitcher } from "../switcher";
import { profile } from "../content";
import styles from "./styles.module.css";

export function EditorialNoirView() {
  const [light, setLight] = useState(false);

  return (
    <div className={light ? `${styles.page} ${styles.light}` : styles.page}>
      <button
        type="button"
        className={styles.themeToggle}
        onClick={() => setLight((value) => !value)}
        aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
      >
        {light ? "☾" : "☀"}
      </button>
      <div className={styles.ghost} aria-hidden>
        MW
      </div>
      <div className={styles.in}>
        <header className={styles.mast}>
          <h1 className={styles.name}>{profile.name}</h1>
          <div className={styles.role}>Software Engineering · Finance</div>
        </header>
        <p className={styles.lede}>
          Purdue engineer with a quant streak — Capital One, a London startup,
          and trading algorithms that earn their keep.
        </p>

        <h2 className={styles.sectionTitle}>Experience</h2>
        {profile.experiences.map((exp) => (
          <article key={exp.company} className={styles.job}>
            <div className={styles.when}>{exp.dates}</div>
            <div>
              <h3 className={styles.jobTitle}>{exp.title}</h3>
              <div className={styles.co}>
                {exp.company} · {exp.location}
              </div>
              <ul className={styles.bullets}>
                {exp.bullets.map((bullet, i) => (
                  <li key={i}>{bullet}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}

        <h2 className={styles.sectionTitle}>Projects</h2>
        <div className={styles.projRow}>
          {profile.projects.map((project) => (
            <article key={project.name} className={styles.projItem}>
              <h3 className={styles.projName}>{project.name}</h3>
              <div className={styles.dts}>
                {project.org} · {project.dates}
              </div>
              <p className={styles.projText}>{project.bullets[0]}</p>
              {project.repoUrl ? (
                <a
                  className={styles.repo}
                  href={project.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View repository ↗
                </a>
              ) : null}
            </article>
          ))}
        </div>

        <footer className={styles.colophon}>
          <a
            href={profile.contact.linkedin}
            target="_blank"
            rel="noopener noreferrer"
          >
            LINKEDIN
          </a>
          ·
          <a
            href={profile.contact.github}
            target="_blank"
            rel="noopener noreferrer"
          >
            GITHUB
          </a>
          ·<a href={`mailto:${profile.contact.email}`}>EMAIL</a>
        </footer>
      </div>
      <DesignSwitcher current="e3" />
    </div>
  );
}
