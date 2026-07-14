export const TOOL_ROUTES = ["home", "delta-force", "delta-force/calibration", "beauty-cam", "milk-tea"];

export function normalizeToolRoute(route) {
  return TOOL_ROUTES.includes(route) ? route : "home";
}
