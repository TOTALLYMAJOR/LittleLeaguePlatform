import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PrivacyPolicyPage from "./privacy/page";
import TermsOfServicePage from "./terms/page";

describe("public legal pages", () => {
  it("publishes the SMS privacy and opt-out promises", () => {
    const html = renderToStaticMarkup(createElement(PrivacyPolicyPage));

    expect(html).toContain("Privacy Policy");
    expect(html).toContain("will not share or sell your mobile information");
    expect(html).toContain("purposes unrelated to providing you with the services of that campaign");
    expect(html).toContain("promotional or marketing purposes");
    expect(html).toContain("Reply <strong>STOP</strong> to opt out");
    expect(html).toContain("Reply <strong>HELP</strong> for help");
  });

  it("links the LeaguePilot brand, SMS terms, and privacy policy", () => {
    const html = renderToStaticMarkup(createElement(TermsOfServicePage));

    expect(html).toContain("operated under the LeaguePilot brand");
    expect(html).toContain("SMS consent is not a condition");
    expect(html).toContain('href="/privacy"');
  });
});
