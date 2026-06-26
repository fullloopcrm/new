// "What broke, and what we learned" — the honest engineering retrospective.
// Grounded in real decisions visible in the codebase (billing drift, retiring
// the email payment monitor, GPS toggling, the chatbot→Yinez evolution).
import { Band, Column, P, H3, Quote, Callout, Source } from "./Primitives";
import { C, codeToken, sectionTitle, partLabel } from "./cs";

export default function Lessons() {
  return (
    <Band tone="canvas">
      <Column className="py-20 sm:py-24">
        <span style={{ ...partLabel }}>The honest retrospective</span>
        <h3 style={{ ...sectionTitle, fontSize: "clamp(24px, 3vw, 42px)" }} className="mt-4">What broke, and what it taught us</h3>
        <P>It would be easy, and dishonest, to present five months and 1,491 commits as a clean march from idea to autonomous business. It wasn&apos;t. The reason there are 1,491 commits and not 400 is that a great many of them are corrections — the system getting something wrong with a real customer and being fixed before the next one. That&apos;s not a flaw in the story; it&apos;s the most honest thing about it.</P>

        <P>A build record this long is also a record of mistakes — and the interesting ones left fingerprints in the code. None of these are hypothetical; each is a real problem the live business hit and a real decision about how to fix it. They&apos;re worth telling because they&apos;re where the design philosophy actually came from.</P>

        <H3>The billing rule drifted because it was copy-pasted</H3>
        <P>Early on, the half-hour rounding logic lived in several places. The copies drifted, and cleaners got overpaid for running a few minutes long. The fix wasn&apos;t a clever algorithm — it was discipline: collapse the rule into one file, <span style={codeToken}>billing-hours.ts</span>, that every billing and pay path must call, so the two grace windows (10 minutes for clients, 15 for cleaners) can never diverge again. The lesson is old and keeps being true: every business rule that exists in more than one place will eventually contradict itself, and money rules contradict themselves expensively.</P>

        <H3>We trusted email to confirm payments, and stopped</H3>
        <P>An earlier version watched an inbox to auto-confirm non-Stripe payments — parsing Zelle and Venmo notification emails. It worked, until you imagine the failure mode: a misread email marks a job paid when it wasn&apos;t, and the system cheerfully pays out the cleaner on money that never arrived. So the payment path was deliberately <em>narrowed</em>. Stripe became the single confirmable source of truth; the email monitor was retired; anything that can&apos;t be confirmed cleanly gets flagged for a human instead of guessed. We removed automation on purpose, because the wrong automation is worse than none.</P>

        <Callout title="The principle that came out of it">
          Automation&apos;s job is not to always act. It&apos;s to act when it&apos;s certain and escalate when it isn&apos;t. A system that confidently does the wrong thing destroys more trust than a system that occasionally asks a human. We chose &ldquo;ask&rdquo; every time the alternative was &ldquo;guess about money.&rdquo;
        </Callout>

        <H3>The AI took three months to trust — correctly</H3>
        <P>Yinez didn&apos;t arrive in February with the rest of the platform, and that gap was earned, not lazy. The early chatbot taught us exactly how a language model fails in front of paying customers: it gets helpful and invents a price, a time, a reassurance. The entire architecture of the final agent — look everything up, never recall a fact, read the context block before the message, gate the dangerous tools by channel — is a direct response to watching those failures. The two and a half months between the first chatbot and Yinez is the cost of learning to trust an AI with real money, and we&apos;d spend it again.</P>

        <H3>GPS was right in theory and wrong in the field</H3>
        <P>GPS-verified check-in is a great idea until a real cleaner is standing in a basement apartment with no signal, blocked from starting their job by a feature meant to help. The system has had to toggle and tune that behavior against field reality — the most recent commit in this very build record is exactly that kind of adjustment. The lesson: a control that&apos;s correct on a whiteboard can still be wrong for the human holding the phone, and the only way to find out is to run it on a real crew.</P>

        <P>There&apos;s a counterintuitive lesson buried in all four, and it&apos;s the one most worth carrying out of this section: the path to more automation ran through <em>removing</em> automation that wasn&apos;t safe. The email payment monitor was deleted. The billing rule was centralized and made stricter. The AI was given fewer liberties, not more. The GPS check was made optional where reality demanded. Every step toward a business that runs itself was also a step toward a business that knows precisely what it should not do on its own. That&apos;s not a contradiction; it&apos;s the actual craft of building something trustworthy enough to leave alone.</P>

        <Quote attribution="The meta-lesson">
          Every one of these fixes came from the decision to run a real business instead of a demo. A demo never overpays a cleaner, never misreads a payment email, never gets stuck in a basement. The mistakes are the proof that the proving was real.
        </Quote>

        <H3>The pattern across all four</H3>
        <P>Step back and the four mistakes rhyme. Each was a case of the system being too confident: confident the copy-pasted rule still matched, confident the email meant payment, confident the model knew the price, confident the GPS check was always right. And each fix moved the system toward humility — one source of truth, verify before acting, look it up don&apos;t recall it, tune against reality. If there&apos;s a single design principle that the live business beat into the platform, it&apos;s that <em>confidence is the enemy of reliability</em>. A system that knows what it doesn&apos;t know, and asks, is worth more than one that&apos;s usually right and occasionally, expensively, wrong.</P>

        <P>This is the part a normal case study leaves out, and it&apos;s the part we think matters most. The systems in Part V are good <em>because</em> of this list, not in spite of it. An operator inheriting the platform inherits the scar tissue too — every one of these mistakes is one they won&apos;t have to make.</P>

        <Source>Each item reflects a real decision recorded in the codebase: the <span style={codeToken}>billing-hours.ts</span> consolidation, the retirement of the email payment monitor in favor of Stripe, the chatbot-to-Yinez evolution (Feb→Apr), and ongoing GPS check-in tuning (visible in the latest commits).</Source>
      </Column>
    </Band>
  );
}
