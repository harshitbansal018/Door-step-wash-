import { PolicyPage, PolicySection } from "@/components/site/policy-page";
import { siteContentService } from "@/server/services/site-content.service";

export default async function RefundPolicyPage() {
  const { refund } = (await siteContentService.get()).policies;
  return <PolicyPage title={refund.title} updated={refund.updated}>{refund.sections.map((section) => <PolicySection key={section.title} title={section.title}><p>{section.body}</p></PolicySection>)}</PolicyPage>;
}
