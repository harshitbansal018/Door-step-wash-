import { PolicyPage, PolicySection } from "@/components/site/policy-page";
import { siteContentService } from "@/server/services/site-content.service";

export default async function PrivacyPage() {
  const { privacy } = (await siteContentService.get()).policies;
  return <PolicyPage title={privacy.title} updated={privacy.updated}>{privacy.sections.map((section) => <PolicySection key={section.title} title={section.title}><p>{section.body}</p></PolicySection>)}</PolicyPage>;
}
