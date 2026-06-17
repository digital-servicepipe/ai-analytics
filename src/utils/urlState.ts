import LZString from "lz-string";
import type { Filters } from "../types";

export type UrlState = {
  screen: string | null;
  filters: Partial<Filters>;
};

const COMPRESSED_KEY = "s"; // "s" for state

export function parseUrlState(): UrlState {
  const params = new URLSearchParams(window.location.search);
  
  // 1. Пытаемся прочитать сжатое состояние
  const compressed = params.get(COMPRESSED_KEY);
  if (compressed) {
    try {
      const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
      if (decompressed) {
        return JSON.parse(decompressed) as UrlState;
      }
    } catch (e) {
      console.error("Failed to parse compressed URL state", e);
    }
  }

  // 2. Если сжатого нет, читаем обычные параметры
  const filters: Partial<Filters> = {};
  
  const dateFrom = params.get("dateFrom");
  if (dateFrom) filters.dateFrom = dateFrom;
  
  const dateTo = params.get("dateTo");
  if (dateTo) filters.dateTo = dateTo;
  
  const pathQuery = params.get("pathQuery");
  if (pathQuery) filters.pathQuery = pathQuery;
  
  // Читаем через запятую (более компактный и привычный вид)
  const getArray = (key: string) => params.get(key)?.split(",").filter(Boolean) || [];

  const agentGroups = getArray("agentGroups");
  if (agentGroups.length > 0) filters.agentGroups = agentGroups;
  
  const agentDetails = getArray("agentDetails");
  if (agentDetails.length > 0) filters.agentDetails = agentDetails;
  
  const sections = getArray("sections");
  if (sections.length > 0) filters.sections = sections;
  
  const countries = getArray("countries");
  if (countries.length > 0) filters.countries = countries;

  return {
    screen: params.get("screen"),
    filters,
  };
}

export function updateUrlState(screen: string, filters: Filters, emptyFilters: Filters): void {
  const params = new URLSearchParams();
  
  // Собираем объект для возможного сжатия
  const stateToPersist: any = { screen };
  const activeFilters: any = {};

  if (filters.dateFrom && filters.dateFrom !== emptyFilters.dateFrom) activeFilters.dateFrom = filters.dateFrom;
  if (filters.dateTo && filters.dateTo !== emptyFilters.dateTo) activeFilters.dateTo = filters.dateTo;
  if (filters.pathQuery && filters.pathQuery !== emptyFilters.pathQuery) activeFilters.pathQuery = filters.pathQuery;
  
  if (filters.agentGroups.length > 0) activeFilters.agentGroups = filters.agentGroups;
  if (filters.agentDetails.length > 0) activeFilters.agentDetails = filters.agentDetails;
  if (filters.sections.length > 0) activeFilters.sections = filters.sections;
  if (filters.countries.length > 0) activeFilters.countries = filters.countries;

  if (Object.keys(activeFilters).length > 0) {
    stateToPersist.filters = activeFilters;
  }

  // Считаем длину "красивого" URL (через запятую)
  const buildParams = (p: URLSearchParams) => {
    if (screen !== "overview") p.set("screen", screen);
    if (activeFilters.dateFrom) p.set("dateFrom", activeFilters.dateFrom);
    if (activeFilters.dateTo) p.set("dateTo", activeFilters.dateTo);
    if (activeFilters.pathQuery) p.set("pathQuery", activeFilters.pathQuery);
    
    if (filters.agentGroups.length > 0) p.set("agentGroups", filters.agentGroups.join(","));
    if (filters.agentDetails.length > 0) p.set("agentDetails", filters.agentDetails.join(","));
    if (filters.sections.length > 0) p.set("sections", filters.sections.join(","));
    if (filters.countries.length > 0) p.set("countries", filters.countries.join(","));
  };

  const tempParams = new URLSearchParams();
  buildParams(tempParams);
  const standardSearch = tempParams.toString();

  // Если URL слишком длинный (больше 400 символов), сжимаем его
  if (standardSearch.length > 400) {
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(stateToPersist));
    params.set(COMPRESSED_KEY, compressed);
  } else {
    buildParams(params);
  }

  // Чтобы запятые в URL не превращались в %2C и выглядели красиво
  const search = params.toString().replace(/%2C/g, ",");
  const nextUrl = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
  
  window.history.replaceState(null, "", nextUrl);
}
