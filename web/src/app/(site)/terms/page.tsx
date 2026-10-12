import { PolicyPage, PolicySection } from "@/components/site/policy-page";
import { siteContentService } from "@/server/services/site-content.service";

export default async function TermsPage() {
  const { terms } = (await siteContentService.get()).policies;
  return <PolicyPage title={terms.title} updated={terms.updated}>{terms.sections.map((section) => <PolicySection key={section.title} title={section.title}><p>{section.body}</p></PolicySection>)}</PolicyPage>;
}
