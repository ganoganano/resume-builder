import exampleData from "@/lib/example-data.json";

const API_ROOT = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
export const API_BASE_URL = API_ROOT ? `${API_ROOT}/api/v1` : "/api/v1";
export const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export type Profile = {
  id?: number;
  name: string;
  as_of_date: string;
  self_pr: string;
  pr_highlights: { id?: number; sort_order: number; title: string; body: string }[];
};

export type Employment = {
  id: number;
  sort_order: number;
  company_name: string;
  start_date: string;
  end_date?: string | null;
  note?: string | null;
};

export type Project = {
  id: number;
  employment_id: number;
  sort_order: number;
  start_date: string;
  end_date?: string | null;
  title: string;
  overview?: string | null;
  role?: string | null;
  team_size?: string | null;
  phases: string[];
  tasks: string;
  achievements: string;
  os: string[];
  languages: string[];
  frameworks: string[];
  databases: string[];
  others: string[];
};

export type Skill = {
  id: number;
  category: string;
  sort_order: number;
  name: string;
  experience?: string | null;
  description?: string | null;
};

export type SkillsByCategory = { category: string; skills: Skill[] };
export type Certification = { id: number; sort_order: number; date?: string | null; name: string };
export type ResumeSectionKey = "self_pr" | "employment" | "skills" | "certifications";
export type ResumeSettings = {
  id?: number;
  skills_on_new_page: boolean;
  certifications_on_new_page: boolean;
  allow_section_split: boolean;
  font_scale: number;
  section_order: ResumeSectionKey[];
  section_page_breaks: Record<ResumeSectionKey, boolean>;
};

export type ResumeBackup = {
  version: number;
  profile: Profile;
  settings: ResumeSettings;
  employments: Employment[];
  projects: Project[];
  skills: Skill[];
  certifications: Certification[];
};

const DEMO_STORAGE_KEY = "resume-demo-data-v1";
const DEMO_STORAGE_SOURCE_KEY = "resume-demo-data-source-v1";
const DEMO_SOURCE_EXAMPLE = "example";
const DEMO_SOURCE_USER = "user";

const defaultProfile: Profile = {
  id: 1,
  name: "",
  as_of_date: "",
  self_pr: "",
  pr_highlights: [],
};

const defaultSettings: ResumeSettings = {
  id: 1,
  skills_on_new_page: false,
  certifications_on_new_page: false,
  allow_section_split: false,
  font_scale: 1.0,
  section_order: ["self_pr", "employment", "skills", "certifications"],
  section_page_breaks: {
    self_pr: false,
    employment: false,
    skills: false,
    certifications: false,
  },
};

const DEMO_EXAMPLE_BACKUP = normalizeBackup(exampleData);

function createDefaultBackup(): ResumeBackup {
  return {
    version: 1,
    profile: { ...defaultProfile },
    settings: { ...defaultSettings },
    employments: [],
    projects: [],
    skills: [],
    certifications: [],
  };
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeSectionOrder(value: unknown): ResumeSectionKey[] {
  const fallback: ResumeSectionKey[] = ["self_pr", "employment", "skills", "certifications"];
  if (!Array.isArray(value)) return fallback;
  const keys = value.filter((item): item is ResumeSectionKey =>
    item === "self_pr" || item === "employment" || item === "skills" || item === "certifications"
  );
  if (keys.length !== fallback.length || [...keys].sort().join(",") !== [...fallback].sort().join(",")) {
    return fallback;
  }
  return keys;
}

function normalizeSectionPageBreaks(value: unknown): Record<ResumeSectionKey, boolean> {
  const fallback = defaultSettings.section_page_breaks;
  if (!value || typeof value !== "object") return { ...fallback };
  const data = value as Partial<Record<ResumeSectionKey, unknown>>;
  return {
    self_pr: Boolean(data.self_pr),
    employment: Boolean(data.employment),
    skills: Boolean(data.skills),
    certifications: Boolean(data.certifications),
  };
}

function normalizeBackup(input: unknown): ResumeBackup {
  const fallback = createDefaultBackup();
  if (!input || typeof input !== "object") return fallback;
  const data = input as Partial<ResumeBackup>;
  return {
    version: typeof data.version === "number" ? data.version : 1,
    profile: {
      id: 1,
      name: typeof data.profile?.name === "string" ? data.profile.name : "",
      as_of_date: typeof data.profile?.as_of_date === "string" ? data.profile.as_of_date : "",
      self_pr: typeof data.profile?.self_pr === "string" ? data.profile.self_pr : "",
      pr_highlights: Array.isArray(data.profile?.pr_highlights) ? data.profile!.pr_highlights : [],
    },
    settings: {
      id: 1,
      skills_on_new_page: Boolean(data.settings?.skills_on_new_page),
      certifications_on_new_page: Boolean(data.settings?.certifications_on_new_page),
      allow_section_split: Boolean(data.settings?.allow_section_split),
      font_scale: typeof data.settings?.font_scale === "number" ? data.settings.font_scale : 1.0,
      section_order: normalizeSectionOrder(data.settings?.section_order),
      section_page_breaks: normalizeSectionPageBreaks(data.settings?.section_page_breaks),
    },
    employments: Array.isArray(data.employments) ? data.employments : [],
    projects: Array.isArray(data.projects) ? data.projects : [],
    skills: Array.isArray(data.skills) ? data.skills : [],
    certifications: Array.isArray(data.certifications) ? data.certifications : [],
  };
}

function serializeBackup(data: ResumeBackup): string {
  return JSON.stringify(normalizeBackup(data));
}

function readDemoDataSource(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(DEMO_STORAGE_SOURCE_KEY);
}

function writeDemoDataSource(source: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(DEMO_STORAGE_SOURCE_KEY, source);
}

function readDemoData(): ResumeBackup {
  if (!isBrowser()) return createDefaultBackup();
  const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
  if (!raw) {
    const seeded = clone(DEMO_EXAMPLE_BACKUP);
    writeDemoData(seeded, DEMO_SOURCE_EXAMPLE);
    return seeded;
  }
  try {
    return normalizeBackup(JSON.parse(raw));
  } catch {
    const seeded = clone(DEMO_EXAMPLE_BACKUP);
    writeDemoData(seeded, DEMO_SOURCE_EXAMPLE);
    return seeded;
  }
}

function writeDemoData(data: ResumeBackup, source = DEMO_SOURCE_USER): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
  writeDemoDataSource(source);
}

function updateDemoData(mutator: (current: ResumeBackup) => ResumeBackup): ResumeBackup {
  const next = mutator(readDemoData());
  writeDemoData(next, DEMO_SOURCE_USER);
  return clone(next);
}

function nextId(items: Array<{ id?: number }>): number {
  return items.reduce((max, item) => Math.max(max, item.id ?? 0), 0) + 1;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      message = body.detail ?? message;
    } catch {}
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const get = <T,>(url: string) => request<T>(url);
const post = <T,>(url: string, data: unknown) =>
  request<T>(url, { method: "POST", body: JSON.stringify(data) });
const put = <T,>(url: string, data: unknown) =>
  request<T>(url, { method: "PUT", body: JSON.stringify(data) });
const del = <T,>(url: string) => request<T>(url, { method: "DELETE" });

export async function fetchProfile(): Promise<Profile> {
  if (!IS_DEMO_MODE) return get<Profile>("/profile");
  return clone(readDemoData().profile);
}

export async function updateProfile(data: Profile): Promise<Profile> {
  if (!IS_DEMO_MODE) return put<Profile>("/profile", data);
  return updateDemoData((current) => ({
    ...current,
    profile: {
      ...current.profile,
      ...data,
      id: 1,
      pr_highlights: current.profile.pr_highlights,
    },
  })).profile;
}

export async function fetchEmployments(): Promise<Employment[]> {
  if (!IS_DEMO_MODE) return get<Employment[]>("/employments");
  return clone(readDemoData().employments).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

export async function createEmployment(data: Partial<Employment>): Promise<Employment> {
  if (!IS_DEMO_MODE) return post<Employment>("/employments", data);
  const next = updateDemoData((current) => {
    const employment: Employment = {
      id: nextId(current.employments),
      sort_order: current.employments.length,
      company_name: data.company_name ?? "",
      start_date: data.start_date ?? "",
      end_date: data.end_date ?? null,
      note: data.note ?? null,
    };
    return { ...current, employments: [...current.employments, employment] };
  });
  return next.employments[next.employments.length - 1];
}

export async function updateEmployment(id: number, data: Partial<Employment>): Promise<Employment> {
  if (!IS_DEMO_MODE) return put<Employment>(`/employments/${id}`, data);
  const next = updateDemoData((current) => ({
    ...current,
    employments: current.employments.map((employment) =>
      employment.id === id ? { ...employment, ...data, id } : employment
    ),
  }));
  const updated = next.employments.find((employment) => employment.id === id);
  if (!updated) throw new Error("Not found");
  return updated;
}

export async function deleteEmployment(id: number): Promise<void> {
  if (!IS_DEMO_MODE) return del<void>(`/employments/${id}`);
  updateDemoData((current) => ({
    ...current,
    employments: current.employments.filter((employment) => employment.id !== id),
    projects: current.projects.filter((project) => project.employment_id !== id),
  }));
}

export async function reorderEmployments(orderedIds: number[]): Promise<{ message: string }> {
  if (!IS_DEMO_MODE) return put<{ message: string }>("/employments/reorder", { ids: orderedIds });
  updateDemoData((current) => ({
    ...current,
    employments: orderedIds
      .map((id, index) => current.employments.find((employment) => employment.id === id))
      .filter((employment): employment is Employment => Boolean(employment))
      .map((employment, index) => ({ ...employment, sort_order: index })),
  }));
  return { message: "Employments reordered successfully" };
}

export async function fetchProjects(employment_id?: number): Promise<Project[]> {
  if (!IS_DEMO_MODE) return get<Project[]>(employment_id ? `/projects?employment_id=${employment_id}` : "/projects");
  const projects = clone(readDemoData().projects)
    .sort((a, b) => a.employment_id - b.employment_id || a.sort_order - b.sort_order || a.id - b.id);
  return employment_id ? projects.filter((project) => project.employment_id === employment_id) : projects;
}

export async function fetchProject(id: number): Promise<Project> {
  if (!IS_DEMO_MODE) return get<Project>(`/projects/${id}`);
  const project = readDemoData().projects.find((entry) => entry.id === id);
  if (!project) throw new Error("Not found");
  return clone(project);
}

export async function createProject(data: Partial<Project>): Promise<Project> {
  if (!IS_DEMO_MODE) return post<Project>("/projects", data);
  const next = updateDemoData((current) => {
    const siblings = current.projects.filter((project) => project.employment_id === data.employment_id);
    const project: Project = {
      id: nextId(current.projects),
      employment_id: data.employment_id ?? 0,
      sort_order: siblings.length,
      start_date: data.start_date ?? "",
      end_date: data.end_date ?? null,
      title: data.title ?? "",
      overview: data.overview ?? null,
      role: data.role ?? null,
      team_size: data.team_size ?? null,
      phases: data.phases ?? [],
      tasks: data.tasks ?? "",
      achievements: data.achievements ?? "",
      os: data.os ?? [],
      languages: data.languages ?? [],
      frameworks: data.frameworks ?? [],
      databases: data.databases ?? [],
      others: data.others ?? [],
    };
    return { ...current, projects: [...current.projects, project] };
  });
  return next.projects[next.projects.length - 1];
}

export async function updateProject(id: number, data: Partial<Project>): Promise<Project> {
  if (!IS_DEMO_MODE) return put<Project>(`/projects/${id}`, data);
  const next = updateDemoData((current) => ({
    ...current,
    projects: current.projects.map((project) => (project.id === id ? { ...project, ...data, id } : project)),
  }));
  const updated = next.projects.find((project) => project.id === id);
  if (!updated) throw new Error("Not found");
  return updated;
}

export async function deleteProject(id: number): Promise<void> {
  if (!IS_DEMO_MODE) return del<void>(`/projects/${id}`);
  updateDemoData((current) => ({
    ...current,
    projects: current.projects.filter((project) => project.id !== id),
  }));
}

export async function reorderProjects(orderedIds: number[]): Promise<{ message: string }> {
  if (!IS_DEMO_MODE) return put<{ message: string }>("/projects/reorder", { ids: orderedIds });
  updateDemoData((current) => {
    const targetProjects = orderedIds
      .map((id) => current.projects.find((project) => project.id === id))
      .filter((project): project is Project => Boolean(project));
    if (targetProjects.length === 0) return current;
    const employmentId = targetProjects[0].employment_id;
    return {
      ...current,
      projects: current.projects.map((project) => {
        const index = orderedIds.indexOf(project.id);
        if (project.employment_id === employmentId && index >= 0) {
          return { ...project, sort_order: index };
        }
        return project;
      }),
    };
  });
  return { message: "Projects reordered successfully" };
}

export async function fetchSkills(): Promise<SkillsByCategory[]> {
  if (!IS_DEMO_MODE) return get<SkillsByCategory[]>("/skills");
  const skills = clone(readDemoData().skills).sort(
    (a, b) => a.category.localeCompare(b.category) || a.sort_order - b.sort_order || a.id - b.id
  );
  const categoryMap = new Map<string, Skill[]>();
  for (const skill of skills) {
    if (!skill.category?.trim() || !skill.name?.trim()) continue;
    categoryMap.set(skill.category, [...(categoryMap.get(skill.category) ?? []), skill]);
  }
  return [...categoryMap.entries()].map(([category, groupedSkills]) => ({ category, skills: groupedSkills }));
}

export async function createSkill(data: Partial<Skill>): Promise<Skill> {
  if (!IS_DEMO_MODE) return post<Skill>("/skills", data);
  const next = updateDemoData((current) => {
    const siblings = current.skills.filter((skill) => skill.category === data.category);
    const skill: Skill = {
      id: nextId(current.skills),
      category: data.category ?? "",
      sort_order: siblings.length,
      name: data.name ?? "",
      experience: data.experience ?? null,
      description: data.description ?? null,
    };
    return { ...current, skills: [...current.skills, skill] };
  });
  return next.skills[next.skills.length - 1];
}

export async function updateSkill(id: number, data: Partial<Skill>): Promise<Skill> {
  if (!IS_DEMO_MODE) return put<Skill>(`/skills/${id}`, data);
  const next = updateDemoData((current) => ({
    ...current,
    skills: current.skills.map((skill) => (skill.id === id ? { ...skill, ...data, id } : skill)),
  }));
  const updated = next.skills.find((skill) => skill.id === id);
  if (!updated) throw new Error("Not found");
  return updated;
}

export async function deleteSkill(id: number): Promise<void> {
  if (!IS_DEMO_MODE) return del<void>(`/skills/${id}`);
  updateDemoData((current) => ({
    ...current,
    skills: current.skills.filter((skill) => skill.id !== id),
  }));
}

export async function reorderSkills(orderedIds: number[]): Promise<{ message: string }> {
  if (!IS_DEMO_MODE) return put<{ message: string }>("/skills/reorder", { ids: orderedIds });
  updateDemoData((current) => ({
    ...current,
    skills: current.skills.map((skill) => {
      const index = orderedIds.indexOf(skill.id);
      return index >= 0 ? { ...skill, sort_order: index } : skill;
    }),
  }));
  return { message: "Skills reordered successfully" };
}

export async function fetchCertifications(): Promise<Certification[]> {
  if (!IS_DEMO_MODE) return get<Certification[]>("/certifications");
  return clone(readDemoData().certifications).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

export async function createCertification(data: Partial<Certification>): Promise<Certification> {
  if (!IS_DEMO_MODE) return post<Certification>("/certifications", data);
  const next = updateDemoData((current) => {
    const certification: Certification = {
      id: nextId(current.certifications),
      sort_order: current.certifications.length,
      date: data.date ?? null,
      name: data.name ?? "",
    };
    return { ...current, certifications: [...current.certifications, certification] };
  });
  return next.certifications[next.certifications.length - 1];
}

export async function updateCertification(id: number, data: Partial<Certification>): Promise<Certification> {
  if (!IS_DEMO_MODE) return put<Certification>(`/certifications/${id}`, data);
  const next = updateDemoData((current) => ({
    ...current,
    certifications: current.certifications.map((certification) =>
      certification.id === id ? { ...certification, ...data, id } : certification
    ),
  }));
  const updated = next.certifications.find((certification) => certification.id === id);
  if (!updated) throw new Error("Not found");
  return updated;
}

export async function deleteCertification(id: number): Promise<void> {
  if (!IS_DEMO_MODE) return del<void>(`/certifications/${id}`);
  updateDemoData((current) => ({
    ...current,
    certifications: current.certifications.filter((certification) => certification.id !== id),
  }));
}

export async function reorderCertifications(orderedIds: number[]): Promise<{ message: string }> {
  if (!IS_DEMO_MODE) return put<{ message: string }>("/certifications/reorder", { ids: orderedIds });
  updateDemoData((current) => ({
    ...current,
    certifications: current.certifications.map((certification) => {
      const index = orderedIds.indexOf(certification.id);
      return index >= 0 ? { ...certification, sort_order: index } : certification;
    }),
  }));
  return { message: "Certifications reordered successfully" };
}

export async function fetchSettings(): Promise<ResumeSettings> {
  if (!IS_DEMO_MODE) return get<ResumeSettings>("/settings");
  return clone(readDemoData().settings);
}

export async function updateSettings(data: ResumeSettings): Promise<ResumeSettings> {
  if (!IS_DEMO_MODE) return put<ResumeSettings>("/settings", data);
  return updateDemoData((current) => ({
    ...current,
    settings: {
      ...current.settings,
      ...data,
      id: 1,
      section_order: normalizeSectionOrder(data.section_order),
      section_page_breaks: normalizeSectionPageBreaks(data.section_page_breaks),
    },
  })).settings;
}

export async function exportBackup(): Promise<Blob> {
  if (!IS_DEMO_MODE) {
    const res = await fetch(`${API_BASE_URL}/export/json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return await res.blob();
  }
  return new Blob([JSON.stringify(readDemoData(), null, 2)], { type: "application/json" });
}

export async function importBackup(data: unknown): Promise<{ message: string }> {
  if (!IS_DEMO_MODE) {
    return request<{ message: string }>("/import/json", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
  writeDemoData(normalizeBackup(data), DEMO_SOURCE_USER);
  return { message: "Backup imported successfully" };
}

export async function fetchResumeBackup(): Promise<ResumeBackup> {
  if (IS_DEMO_MODE) return clone(readDemoData());
  const blob = await exportBackup();
  return normalizeBackup(JSON.parse(await blob.text()));
}

export function isExampleResumeBackup(data: ResumeBackup): boolean {
  if (readDemoDataSource() === DEMO_SOURCE_EXAMPLE) return true;
  return serializeBackup(data) === serializeBackup(DEMO_EXAMPLE_BACKUP);
}

export async function clearDemoData(): Promise<void> {
  if (!IS_DEMO_MODE) return;
  writeDemoData(createDefaultBackup(), DEMO_SOURCE_USER);
}
