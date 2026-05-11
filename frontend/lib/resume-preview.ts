import { ResumeBackup, ResumeSectionKey, Skill } from "@/lib/api";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInlineMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function renderMarkdown(markdown: string): string {
  const source = markdown.trim();
  if (!source) return "";
  const lines = source.split(/\r?\n/);
  const html: string[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      html.push(`<p>${paragraph.map(renderInlineMarkdown).join("<br>")}</p>`);
      paragraph = [];
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      html.push(`<ul>${listItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`);
      listItems = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = Math.min(heading[1].length, 4);
      html.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    const list = line.match(/^[-*]\s+(.+)$/);
    if (list) {
      flushParagraph();
      listItems.push(list[1]);
      continue;
    }
    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return html.join("");
}

function getDisplayDate(value: string): string {
  if (value?.trim()) return value;
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = `${now.getMonth() + 1}`.padStart(2, "0");
  const dd = `${now.getDate()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function renderTechTags(values: string[]): string {
  if (!values.length) return "";
  return `<div class="tech-tags">${values.map((value) => `<span class="tech-tag">${escapeHtml(value)}</span>`).join("")}</div>`;
}

function renderProjectItem(project: ResumeBackup["projects"][number]): string {
  return `
    <div class="project-item">
      <p class="project-title">${escapeHtml(project.title)}</p>
      <table class="project-layout-table">
        <tr>
          <td class="project-meta-column">
            <p class="project-side-heading">期間</p>
            <div class="project-date-stack">
              <div class="project-date-item"><span class="project-date-value">${escapeHtml(project.start_date)}</span></div>
              <div class="project-date-separator"></div>
              <div class="project-date-item"><span class="project-date-value">${escapeHtml(project.end_date || "現在")}</span></div>
            </div>
            ${
              project.role || project.team_size || project.phases.length
                ? `
              <div class="project-meta-block">
                ${project.role ? `<div class="project-meta-entry"><span class="project-meta-label">役割</span><span class="project-meta-value">${escapeHtml(project.role)}</span></div>` : ""}
                ${project.team_size ? `<div class="project-meta-entry"><span class="project-meta-label">規模</span><span class="project-meta-value">${escapeHtml(project.team_size)}</span></div>` : ""}
                ${
                  project.phases.length
                    ? `<div class="project-meta-entry"><span class="project-meta-label">担当</span><div class="project-meta-tags">${project.phases.map((phase) => `<span class="tech-tag">${escapeHtml(phase)}</span>`).join("")}</div></div>`
                    : ""
                }
              </div>
            `
                : ""
            }
          </td>
          <td class="project-main-column">
            ${project.overview ? `<div class="project-field"><span class="project-field-label">【概要】</span><span class="project-field-content pre-wrap">${escapeHtml(project.overview)}</span></div>` : ""}
            ${project.tasks ? `<div class="project-field"><span class="project-field-label">【業務内容】</span><div class="project-field-markdown">${renderMarkdown(project.tasks)}</div></div>` : ""}
            ${project.achievements ? `<div class="project-field"><span class="project-field-label">【実績・取り組み】</span><div class="project-field-markdown">${renderMarkdown(project.achievements)}</div></div>` : ""}
          </td>
          <td class="project-tech-column">
            <p class="project-side-heading">環境</p>
            ${project.os.length ? `<div class="project-tech-group"><span class="project-tech-label">OS</span>${renderTechTags(project.os)}</div>` : ""}
            ${project.languages.length ? `<div class="project-tech-group"><span class="project-tech-label">言語</span>${renderTechTags(project.languages)}</div>` : ""}
            ${project.frameworks.length ? `<div class="project-tech-group"><span class="project-tech-label">フレームワーク</span>${renderTechTags(project.frameworks)}</div>` : ""}
            ${project.databases.length ? `<div class="project-tech-group"><span class="project-tech-label">DB</span>${renderTechTags(project.databases)}</div>` : ""}
            ${project.others.length ? `<div class="project-tech-group"><span class="project-tech-label">その他</span>${renderTechTags(project.others)}</div>` : ""}
            ${
              !project.os.length && !project.languages.length && !project.frameworks.length && !project.databases.length && !project.others.length
                ? `<p class="text-muted">記載なし</p>`
                : ""
            }
          </td>
        </tr>
      </table>
    </div>
  `;
}

function renderSkillRows(skills: Skill[]): string {
  const grouped = new Map<string, Skill[]>();
  skills
    .sort((a, b) => a.category.localeCompare(b.category) || a.sort_order - b.sort_order || a.id - b.id)
    .forEach((skill) => {
      if (!skill.category?.trim() || !skill.name?.trim()) return;
      grouped.set(skill.category, [...(grouped.get(skill.category) ?? []), skill]);
    });

  return [...grouped.entries()]
    .map(([category, entries]) =>
      entries
        .map(
          (skill, index) => `
            <tr>
              ${index === 0 ? `<td class="skill-category-cell" rowspan="${entries.length}" style="width: 4.6em; min-width: 4.6em; max-width: 4.6em;"><span class="skill-category-text">${escapeHtml(category)}</span></td>` : ""}
              <td class="skill-name">${escapeHtml(skill.name)}</td>
              <td class="skill-experience">${escapeHtml(skill.experience || "-")}</td>
              <td class="skill-description">${escapeHtml(skill.description || "-")}</td>
            </tr>
          `
        )
        .join("")
    )
    .join("");
}

function renderEmploymentSection(data: ResumeBackup): string {
  const employments = data.employments
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
    .map((employment, index) => {
          const projects = data.projects
            .filter((project) => project.employment_id === employment.id)
            .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
          const block = `
            <div class="employment-section">
              ${index === 0 ? `<h2>職務経歴</h2>` : ""}
              ${
                projects.length > 0
                  ? `
                    <div class="employment-opening">
                      <div class="employment-header">
                        <div class="employment-title-row">
                          <p class="employment-company">${escapeHtml(employment.company_name)}</p>
                          <p class="employment-period">${escapeHtml(employment.start_date)} ～ ${escapeHtml(employment.end_date || "現在")}</p>
                        </div>
                        ${employment.note ? `<p class="employment-note">※ ${escapeHtml(employment.note)}</p>` : ""}
                      </div>
                      ${renderProjectItem(projects[0])}
                    </div>
                    ${projects.slice(1).map((project) => renderProjectItem(project)).join("")}
                  `
                  : `
                    <div class="employment-opening">
                      <div class="employment-header">
                        <div class="employment-title-row">
                          <p class="employment-company">${escapeHtml(employment.company_name)}</p>
                          <p class="employment-period">${escapeHtml(employment.start_date)} ～ ${escapeHtml(employment.end_date || "現在")}</p>
                        </div>
                        ${employment.note ? `<p class="employment-note">※ ${escapeHtml(employment.note)}</p>` : ""}
                      </div>
                      <p class="text-muted">プロジェクト情報はありません。</p>
                    </div>
                  `
              }
            </div>
          `;
          return block;
        })
        .join("");

  return `<section>${employments}</section>`;
}

function renderSection(sectionKey: ResumeSectionKey, data: ResumeBackup): string {
  if (sectionKey === "self_pr" && data.profile.self_pr.trim()) {
    return `
      <section class="self-pr${data.settings.section_page_breaks[sectionKey] ? " page-break-before" : ""}">
        <div class="self-pr-heading">自己PR</div>
        <div class="self-pr-body">
          <div class="self-pr-markdown">${renderMarkdown(data.profile.self_pr)}</div>
        </div>
      </section>
    `;
  }

  if (sectionKey === "employment") {
    const content = renderEmploymentSection(data);
    return data.settings.section_page_breaks[sectionKey]
      ? content.replace("<section>", '<section class="page-break-before">')
      : content;
  }

  if (sectionKey === "skills" && data.skills.length > 0) {
    return `
      <section class="skills-section${data.settings.skills_on_new_page || data.settings.section_page_breaks[sectionKey] ? " page-break-before" : ""}">
        <h2>スキル</h2>
        <table class="skill-table">
          <colgroup>
            <col class="skill-category-col" style="width: 5em; min-width: 5em; max-width: 5em;" />
            <col class="skill-name-col" />
            <col class="skill-experience-col" />
            <col class="skill-description-col" />
          </colgroup>
          <thead>
            <tr><th class="skill-category-head" style="width: 4.6em; min-width: 4.6em; max-width: 4.6em;">分類</th><th>スキル</th><th>経験</th><th>備考</th></tr>
          </thead>
          <tbody>${renderSkillRows(data.skills)}</tbody>
        </table>
      </section>
    `;
  }

  if (sectionKey === "certifications" && data.certifications.length > 0) {
    return `
      <section class="${data.settings.certifications_on_new_page || data.settings.section_page_breaks[sectionKey] ? "page-break-before" : ""}">
        <h2>資格</h2>
        <table class="certifications-table">
          <thead><tr><th>取得年月</th><th>資格名</th></tr></thead>
          <tbody>
            ${data.certifications
              .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
              .map((cert) => `<tr><td>${escapeHtml(cert.date || "-")}</td><td>${escapeHtml(cert.name)}</td></tr>`)
              .join("")}
          </tbody>
        </table>
      </section>
    `;
  }

  return "";
}

export function buildResumePreviewHtml(data: ResumeBackup): string {
  const displayDate = getDisplayDate(data.profile.as_of_date);
  const sections = data.settings.section_order.map((sectionKey) => renderSection(sectionKey, data)).join("");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>職務経歴書 - ${escapeHtml(data.profile.name || "")}</title>
  <style>
    :root { --font-scale: ${data.settings.font_scale}; }
    @page { size: A4; margin: 15mm 20mm; }
    * { box-sizing: border-box; }
    body { font-family: "Noto Sans JP", sans-serif; font-size: calc(10.5pt * var(--font-scale)); line-height: 1.42; color: #333; margin: 0; padding: 0; background: #fff; }
    .container { max-width: 210mm; margin: 0 auto; }
    h1 { font-size: calc(22pt * var(--font-scale)); font-weight: 700; margin: 0 0 6px 0; color: #1a1a1a; border-bottom: 3px solid #2c5282; padding-bottom: 6px; }
    h2 { font-size: calc(14pt * var(--font-scale)); font-weight: 700; margin: 18px 0 8px 0; color: #2c5282; border-left: 4px solid #2c5282; padding-left: 10px; page-break-after: avoid; }
    h3 { font-size: calc(12pt * var(--font-scale)); font-weight: 700; margin: 12px 0 6px 0; color: #333; }
    h4 { font-size: calc(11pt * var(--font-scale)); font-weight: 600; margin: 8px 0 4px 0; color: #444; }
    p { margin: 4px 0; }
    .header { margin-bottom: 14px; }
    .header-meta { display: flex; justify-content: flex-end; align-items: flex-start; margin-top: 10px; }
    .header-summary { text-align: right; }
    .header-name { display: block; font-size: calc(11pt * var(--font-scale)); font-weight: 700; color: #2d3748; margin-bottom: 2px; }
    .header-date { display: block; font-size: calc(10pt * var(--font-scale)); color: #666; }
    .self-pr { margin: 0 0 18px 0; }
    .self-pr-heading { font-size: calc(14pt * var(--font-scale)); font-weight: 700; color: #2c5282; margin: 0 0 6px 0; border-left: 4px solid #2c5282; padding-left: 10px; }
    .self-pr-body { padding: 0 0 0 12px; }
    .self-pr-markdown > *:first-child, .project-field-markdown > *:first-child { margin-top: 0; }
    .self-pr-markdown > *:last-child, .project-field-markdown > *:last-child { margin-bottom: 0; }
    .self-pr-markdown p, .self-pr-markdown ul, .self-pr-markdown ol, .self-pr-markdown blockquote,
    .project-field-markdown p, .project-field-markdown ul, .project-field-markdown ol, .project-field-markdown blockquote { margin: 2px 0; }
    .self-pr-markdown ul, .self-pr-markdown ol, ul, ol { padding-left: 16px; }
    .project-field-markdown ul, .project-field-markdown ol { padding-left: 12px; }
    .self-pr-markdown li, .project-field-markdown li { margin-bottom: 1px; line-height: 1.25; }
    .self-pr-markdown h1, .self-pr-markdown h2, .self-pr-markdown h3, .self-pr-markdown h4 { color: #2c5282; margin: 4px 0 2px 0; border: none; padding: 0; }
    .employment-section { margin-bottom: 14px; page-break-inside: avoid; }
    .employment-opening { page-break-inside: avoid; }
    .allow-section-split .employment-section { page-break-inside: auto; }
    .allow-section-split .project-item { page-break-inside: auto; }
    .employment-header { margin-bottom: 8px; background: #edf2f7; padding: 8px 12px; border-radius: 4px; }
    .employment-title-row { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
    .employment-company { font-size: calc(13pt * var(--font-scale)); font-weight: 700; color: #2d3748; margin: 0; }
    .employment-period { font-size: calc(10pt * var(--font-scale)); color: #4a5568; margin: 0; }
    .employment-note { font-size: calc(9pt * var(--font-scale)); color: #718096; margin: 4px 0 0 0; font-style: italic; }
    .project-item { margin-bottom: 10px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 4px; page-break-inside: avoid; }
    .project-title { font-size: calc(11pt * var(--font-scale)); font-weight: 700; color: #2c5282; margin: 0 0 6px 0; }
    .project-layout-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .project-layout-table td { vertical-align: top; }
    .project-meta-column { width: 88px; border-right: 1px solid #e2e8f0; padding-right: 10px; text-align: center; }
    .project-main-column { padding: 0 14px; }
    .project-tech-column { width: 150px; border-left: 1px solid #e2e8f0; padding-left: 12px; }
    .project-side-heading { font-size: calc(9pt * var(--font-scale)); font-weight: 700; color: #4a5568; margin: 0 0 6px 0; letter-spacing: 0.03em; }
    .project-date-stack { display: flex; flex-direction: column; gap: 0; }
    .project-date-value { display: block; font-size: calc(9.5pt * var(--font-scale)); font-weight: 700; color: #2d3748; line-height: 1.3; text-align: center; }
    .project-date-separator { position: relative; height: 10px; margin: 0; }
    .project-date-separator::after { content: ""; position: absolute; left: 50%; top: 0; width: 0.5px; height: 100%; background: #a0aec0; transform: translateX(-50%); }
    .project-meta-block { padding-top: 12px; }
    .project-meta-entry { margin-bottom: 8px; }
    .project-meta-label, .project-tech-label { display: block; font-size: calc(8.5pt * var(--font-scale)); color: #718096; margin-bottom: 3px; font-weight: 700; }
    .project-meta-value { display: block; font-size: calc(9pt * var(--font-scale)); color: #2d3748; line-height: 1.35; font-weight: 400; }
    .project-meta-tags { display: flex; flex-direction: column; gap: 4px; }
    .project-meta-tags .tech-tag { text-align: center; }
    .project-field { margin-bottom: 6px; }
    .project-field-label { font-weight: 600; color: #4a5568; display: block; margin-bottom: 3px; }
    .project-field-content, .project-field-markdown { display: block; padding-left: 12px; }
    .project-field-content.pre-wrap { white-space: pre-wrap; }
    .project-tech-group { margin-bottom: 6px; }
    .tech-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
    .tech-tag { display: inline-block; background: #e2e8f0; color: #2d3748; border-radius: 999px; padding: 2px 8px; font-size: calc(8.5pt * var(--font-scale)); line-height: 1.3; }
    .skill-table, .certifications-table { width: 100%; border-collapse: collapse; font-size: calc(8.8pt * var(--font-scale)); }
    .skill-table { table-layout: fixed; line-height: 1.2; }
    .skill-category-col { width: 4.6em; min-width: 4.6em; max-width: 4.6em; }
    .skill-name-col { width: 24%; }
    .skill-experience-col { width: 12%; }
    .skill-description-col { width: auto; }
    .skill-table th, .skill-table td, .certifications-table th, .certifications-table td { padding: 2px 3px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    .skill-table th, .certifications-table th { font-weight: 600; color: #4a5568; background: #f7fafc; }
    .skill-table th { font-size: calc(8.4pt * var(--font-scale)); }
    .skill-category-head {
      width: 4.6em !important;
      min-width: 4.6em !important;
      max-width: 4.6em !important;
      overflow: hidden;
    }
    .skill-category-cell {
      width: 4.6em !important;
      min-width: 4.6em !important;
      max-width: 4.6em !important;
      overflow: hidden;
      font-weight: 600;
      color: #4a5568;
      vertical-align: middle;
    }
    .skill-category-text {
      display: block;
      width: 100%;
      white-space: normal;
      word-break: break-all;
      overflow-wrap: anywhere;
      line-height: 1.1;
    }
    .skill-name { width: 24%; line-height: 1.15; }
    .skill-experience { width: 12%; white-space: nowrap; line-height: 1.15; }
    .skill-description { color: #4a5568; line-height: 1.15; }
    code { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; background: #edf2f7; padding: 1px 4px; border-radius: 3px; font-size: 0.95em; }
    .text-muted { color: #718096; }
    .page-break-before { page-break-before: always; }
  </style>
</head>
<body class="${data.settings.allow_section_split ? "allow-section-split" : ""}">
  <div class="container">
    <div class="header">
      <h1>職務経歴書</h1>
      <div class="header-meta">
        <div class="header-summary">
          <span class="header-date">作成日: ${escapeHtml(displayDate)}</span>
          ${data.profile.name ? `<span class="header-name">氏名: ${escapeHtml(data.profile.name)}</span>` : ""}
        </div>
      </div>
    </div>
    ${sections}
  </div>
</body>
</html>`;
}
