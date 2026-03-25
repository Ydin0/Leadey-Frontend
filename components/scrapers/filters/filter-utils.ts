import type { SearchResultRow } from "@/lib/types/scraper";
import type {
  JobsFilterState,
  CompaniesFilterState,
  UniqueCompany,
  ActiveFilterPill,
} from "./filter-types";
import {
  DEFAULT_JOBS_FILTER,
  DEFAULT_COMPANIES_FILTER,
  EMPLOYEE_PRESETS,
  SALARY_PRESETS,
  formatOptionLabel,
  matchesAnyPresetRange,
} from "./filter-types";

// ─── Jobs Filters ────────────────────────────────────────────────────

export function isJobsFilterEmpty(f: JobsFilterState): boolean {
  return (
    f.seniority.length === 0 &&
    f.remote === "all" &&
    f.employmentType.length === 0 &&
    f.salaryRanges.length === 0 &&
    f.scoreMin === null &&
    f.scoreMax === null &&
    f.enrichmentStatus.length === 0 &&
    f.location === "" &&
    f.technologySlugs.length === 0 &&
    f.sourceId.length === 0 &&
    f.postedWithinDays === null &&
    f.companyIndustry.length === 0 &&
    f.companySizeRanges.length === 0 &&
    f.companyFundingStage.length === 0
  );
}

export function applyJobsFilters(
  rows: SearchResultRow[],
  filters: JobsFilterState,
): SearchResultRow[] {
  if (isJobsFilterEmpty(filters)) return rows;

  return rows.filter((row) => {
    // Seniority
    if (filters.seniority.length > 0) {
      if (!row.seniority || !filters.seniority.includes(row.seniority)) return false;
    }

    // Remote
    if (filters.remote === "remote" && !row.isRemote) return false;
    if (filters.remote === "onsite" && row.isRemote) return false;

    // Employment type
    if (filters.employmentType.length > 0) {
      if (!row.employmentStatus || !filters.employmentType.includes(row.employmentStatus)) return false;
    }

    // Salary ranges (multi-select presets)
    if (filters.salaryRanges.length > 0) {
      const salary = row.minSalaryUsd ?? row.maxSalaryUsd;
      if (!matchesAnyPresetRange(salary, filters.salaryRanges, SALARY_PRESETS)) return false;
    }

    // Score range
    if (filters.scoreMin !== null && row.score < filters.scoreMin) return false;
    if (filters.scoreMax !== null && row.score > filters.scoreMax) return false;

    // Enrichment status
    if (filters.enrichmentStatus.length > 0) {
      if (!filters.enrichmentStatus.includes(row.enrichmentStatus)) return false;
    }

    // Location (free-text substring match)
    if (filters.location) {
      const loc = (row.location || "").toLowerCase();
      if (!loc.includes(filters.location.toLowerCase())) return false;
    }

    // Tech stack
    if (filters.technologySlugs.length > 0) {
      if (!filters.technologySlugs.some((t) => row.technologySlugs.includes(t))) return false;
    }

    // Source
    if (filters.sourceId.length > 0) {
      if (!filters.sourceId.some((s) => (row.sourceId || "").includes(s))) return false;
    }

    // Posted within days
    if (filters.postedWithinDays !== null && row.postedAt) {
      const posted = new Date(row.postedAt).getTime();
      const cutoff = Date.now() - filters.postedWithinDays * 86400000;
      if (posted < cutoff) return false;
    }

    // Company industry
    if (filters.companyIndustry.length > 0) {
      if (!row.companyIndustry || !filters.companyIndustry.includes(row.companyIndustry)) return false;
    }

    // Company size (multi-select presets)
    if (filters.companySizeRanges.length > 0) {
      if (!matchesAnyPresetRange(row.companyEmployeeCount, filters.companySizeRanges, EMPLOYEE_PRESETS)) return false;
    }

    // Company funding stage
    if (filters.companyFundingStage.length > 0) {
      if (!row.companyFundingStage || !filters.companyFundingStage.includes(row.companyFundingStage)) return false;
    }

    return true;
  });
}

// ─── Companies Filters ───────────────────────────────────────────────

export function isCompaniesFilterEmpty(f: CompaniesFilterState): boolean {
  return (
    f.industry.length === 0 &&
    f.country.length === 0 &&
    f.employeeSizeRanges.length === 0 &&
    f.fundingStage.length === 0 &&
    f.minJobCount === null
  );
}

export function applyCompaniesFilters(
  companies: UniqueCompany[],
  filters: CompaniesFilterState,
): UniqueCompany[] {
  if (isCompaniesFilterEmpty(filters)) return companies;

  return companies.filter((c) => {
    // Industry
    if (filters.industry.length > 0) {
      if (!c.industry || !filters.industry.includes(c.industry)) return false;
    }

    // Country
    if (filters.country.length > 0) {
      if (!c.country || !filters.country.includes(c.country)) return false;
    }

    // Employee size (multi-select presets)
    if (filters.employeeSizeRanges.length > 0) {
      if (!matchesAnyPresetRange(c.employeeCount, filters.employeeSizeRanges, EMPLOYEE_PRESETS)) return false;
    }

    // Funding stage
    if (filters.fundingStage.length > 0) {
      if (!c.fundingStage || !filters.fundingStage.includes(c.fundingStage)) return false;
    }

    // Min job count
    if (filters.minJobCount !== null) {
      if (c.jobCount < filters.minJobCount) return false;
    }

    return true;
  });
}

// ─── Active Filter Pills ─────────────────────────────────────────────

export function getJobsFilterPills(f: JobsFilterState): ActiveFilterPill[] {
  const pills: ActiveFilterPill[] = [];

  if (f.seniority.length > 0) {
    pills.push({ key: "seniority", label: `Seniority: ${f.seniority.map(formatOptionLabel).join(", ")}` });
  }
  if (f.remote !== "all") {
    pills.push({ key: "remote", label: f.remote === "remote" ? "Remote" : "On-site" });
  }
  if (f.employmentType.length > 0) {
    pills.push({ key: "employmentType", label: `Type: ${f.employmentType.map(formatOptionLabel).join(", ")}` });
  }
  if (f.scoreMin !== null || f.scoreMax !== null) {
    const parts = [];
    if (f.scoreMin !== null) parts.push(`${f.scoreMin}+`);
    if (f.scoreMax !== null) parts.push(`max ${f.scoreMax}`);
    pills.push({ key: "score", label: `Score: ${parts.join(", ")}` });
  }
  if (f.salaryRanges.length > 0) {
    pills.push({ key: "salaryRanges", label: `Salary: ${f.salaryRanges.join(", ")}` });
  }
  if (f.sourceId.length > 0) {
    pills.push({ key: "sourceId", label: `Source: ${f.sourceId.join(", ")}` });
  }
  if (f.technologySlugs.length > 0) {
    pills.push({ key: "technologySlugs", label: `Tech: ${f.technologySlugs.join(", ")}` });
  }
  if (f.location) {
    pills.push({ key: "location", label: `Location: ${f.location}` });
  }
  if (f.postedWithinDays !== null) {
    pills.push({ key: "postedWithinDays", label: `Posted: last ${f.postedWithinDays}d` });
  }
  if (f.companyIndustry.length > 0) {
    pills.push({ key: "companyIndustry", label: `Industry: ${f.companyIndustry.join(", ")}` });
  }
  if (f.companySizeRanges.length > 0) {
    pills.push({ key: "companySizeRanges", label: `Size: ${f.companySizeRanges.join(", ")}` });
  }
  if (f.companyFundingStage.length > 0) {
    pills.push({ key: "companyFundingStage", label: `Funding: ${f.companyFundingStage.map(formatOptionLabel).join(", ")}` });
  }
  if (f.enrichmentStatus.length > 0) {
    pills.push({ key: "enrichmentStatus", label: `Enrichment: ${f.enrichmentStatus.map(formatOptionLabel).join(", ")}` });
  }

  return pills;
}

export function getCompaniesFilterPills(f: CompaniesFilterState): ActiveFilterPill[] {
  const pills: ActiveFilterPill[] = [];

  if (f.fundingStage.length > 0) {
    pills.push({ key: "fundingStage", label: `Funding: ${f.fundingStage.map(formatOptionLabel).join(", ")}` });
  }
  if (f.employeeSizeRanges.length > 0) {
    pills.push({ key: "employeeSizeRanges", label: `Employees: ${f.employeeSizeRanges.join(", ")}` });
  }
  if (f.industry.length > 0) {
    pills.push({ key: "industry", label: `Industry: ${f.industry.join(", ")}` });
  }
  if (f.country.length > 0) {
    pills.push({ key: "country", label: `Country: ${f.country.join(", ")}` });
  }
  if (f.minJobCount !== null) {
    pills.push({ key: "minJobCount", label: `Min Jobs: ${f.minJobCount}` });
  }

  return pills;
}

// ─── Clear Single Filter Key ─────────────────────────────────────────

export function clearJobsFilterKey(
  f: JobsFilterState,
  key: string,
): JobsFilterState {
  switch (key) {
    case "seniority": return { ...f, seniority: [] };
    case "remote": return { ...f, remote: "all" };
    case "employmentType": return { ...f, employmentType: [] };
    case "score": return { ...f, scoreMin: null, scoreMax: null };
    case "salaryRanges": return { ...f, salaryRanges: [] };
    case "salary": return { ...f, salaryRanges: [] };
    case "sourceId": return { ...f, sourceId: [] };
    case "technologySlugs": return { ...f, technologySlugs: [] };
    case "location": return { ...f, location: "" };
    case "postedWithinDays": return { ...f, postedWithinDays: null };
    case "companyIndustry": return { ...f, companyIndustry: [] };
    case "companySizeRanges": return { ...f, companySizeRanges: [] };
    case "companySize": return { ...f, companySizeRanges: [] };
    case "companyFundingStage": return { ...f, companyFundingStage: [] };
    case "enrichmentStatus": return { ...f, enrichmentStatus: [] };
    default: return f;
  }
}

export function clearCompaniesFilterKey(
  f: CompaniesFilterState,
  key: string,
): CompaniesFilterState {
  switch (key) {
    case "fundingStage": return { ...f, fundingStage: [] };
    case "employeeSizeRanges": return { ...f, employeeSizeRanges: [] };
    case "employees": return { ...f, employeeSizeRanges: [] };
    case "industry": return { ...f, industry: [] };
    case "country": return { ...f, country: [] };
    case "minJobCount": return { ...f, minJobCount: null };
    default: return f;
  }
}
