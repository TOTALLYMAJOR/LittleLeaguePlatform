export type QaTarget =
  | { kind: "local"; projectRef: null; targetId: string }
  | { kind: "hosted"; projectRef: string; targetId: string };

export type QaAppInvocation = {
  targetUrl: string;
  mutationConfirm: string;
};

export type QaApplicationTarget = {
  kind: "local" | "hosted";
  baseUrl: string;
};

export type QaTargetIdentity = {
  deploymentClass: string;
  supabaseProjectRef: string | null;
  supabaseTargetId: string;
};

export type QaFetchOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export function captureQaAppInvocation(): Readonly<QaAppInvocation>;

export function assertIsolatedQaTarget(
  url: string,
  action?: string
): QaTarget;

export function assertQaApplicationTarget(
  baseUrl: string,
  invocation?: QaAppInvocation
): QaApplicationTarget;

export function assertServiceRoleCredential(
  value: string
): "secret" | "legacy-jwt";

export function preflightServiceRoleCredential(
  supabaseUrl: string,
  credential: string,
  options?: QaFetchOptions
): Promise<QaTarget>;

export function preflightQaApplicationIdentity(
  baseUrl: string,
  supabaseTarget: QaTarget,
  options?: QaFetchOptions & { invocation?: QaAppInvocation }
): Promise<{
  appTarget: QaApplicationTarget;
  identity: QaTargetIdentity;
}>;

export function runGuardedQaMutation<T>(
  input: QaFetchOptions & {
    action?: string;
    appBaseUrl?: string;
    appInvocation?: QaAppInvocation;
    serviceRoleCredential: string;
    supabaseUrl: string;
  },
  run: (context: {
    appIdentity: {
      appTarget: QaApplicationTarget;
      identity: QaTargetIdentity;
    } | null;
    supabaseTarget: QaTarget;
  }) => T | Promise<T>
): Promise<T>;
