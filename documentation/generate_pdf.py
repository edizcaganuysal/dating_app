#!/usr/bin/env python3
"""Generate research_summary.pdf -- Scientific basis of Yuni."""

from fpdf import FPDF

class YuniPDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(128, 128, 128)
            self.cell(0, 10, "Yuni -- The Science of Romantic Conversion", align="C")
            self.ln(5)
            self.set_draw_color(200, 200, 200)
            self.line(10, self.get_y(), 200, self.get_y())
            self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")

    def title_page(self):
        self.add_page()
        self.ln(50)
        self.set_font("Helvetica", "B", 28)
        self.set_text_color(33, 33, 33)
        self.cell(0, 15, "The Science of", align="C")
        self.ln(15)
        self.cell(0, 15, "Romantic Conversion", align="C")
        self.ln(25)
        self.set_font("Helvetica", "", 16)
        self.set_text_color(100, 100, 100)
        self.cell(0, 10, "An Optimization Framework for Yuni", align="C")
        self.ln(20)
        self.set_draw_color(66, 133, 244)
        self.set_line_width(0.5)
        self.line(60, self.get_y(), 150, self.get_y())
        self.ln(20)
        self.set_font("Helvetica", "", 11)
        self.set_text_color(80, 80, 80)
        self.cell(0, 8, "Approach: Conversion-rate optimization", align="C")
        self.ln(8)
        self.cell(0, 8, "grounded in meta-analytic consensus", align="C")
        self.ln(8)
        self.cell(0, 8, "Lens: Female-first design", align="C")
        self.ln(30)
        self.set_font("Helvetica", "I", 10)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, "Research document for Yuni group dating platform", align="C")
        self.ln(8)
        self.cell(0, 8, "March 2026", align="C")

    def section_title(self, num, title):
        self.ln(8)
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(33, 33, 33)
        self.cell(0, 10, f"{num}. {title}")
        self.ln(4)
        self.set_draw_color(66, 133, 244)
        self.set_line_width(0.4)
        self.line(10, self.get_y(), 80, self.get_y())
        self.ln(6)

    def subsection_title(self, title):
        self.ln(4)
        self.set_font("Helvetica", "B", 12)
        self.set_text_color(50, 50, 50)
        self.cell(0, 8, title)
        self.ln(6)

    def body_text(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(60, 60, 60)
        self.multi_cell(0, 5.5, text)
        self.ln(2)

    def bold_text(self, text):
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(50, 50, 50)
        self.multi_cell(0, 5.5, text)
        self.ln(1)

    def italic_text(self, text):
        self.set_font("Helvetica", "I", 10)
        self.set_text_color(80, 80, 80)
        self.multi_cell(0, 5.5, text)
        self.ln(1)

    def highlight_box(self, text):
        self.ln(2)
        self.set_fill_color(240, 245, 255)
        self.set_draw_color(66, 133, 244)
        x = self.get_x()
        y = self.get_y()
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(33, 66, 133)
        # Calculate height needed
        w = self.w - 2 * self.l_margin - 10
        lines = len(text) / (w / 2.2)  # rough estimate
        h = max(lines * 5.5 + 8, 14)
        self.rect(x + 2, y, self.w - 2 * self.l_margin - 4, h, style="DF")
        self.set_x(x + 7)
        self.set_y(y + 3)
        self.multi_cell(w - 5, 5.5, text)
        self.ln(4)

    def stat_box(self, label, value, description):
        self.set_font("Helvetica", "", 9)
        self.set_text_color(100, 100, 100)
        self.cell(60, 5, label)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(33, 66, 133)
        self.cell(30, 5, value)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(100, 100, 100)
        self.cell(0, 5, description)
        self.ln(6)

    def table_row(self, cells, bold=False, header=False):
        if header:
            self.set_font("Helvetica", "B", 9)
            self.set_fill_color(66, 133, 244)
            self.set_text_color(255, 255, 255)
        elif bold:
            self.set_font("Helvetica", "B", 9)
            self.set_fill_color(245, 245, 245)
            self.set_text_color(33, 33, 33)
        else:
            self.set_font("Helvetica", "", 9)
            self.set_fill_color(255, 255, 255)
            self.set_text_color(60, 60, 60)

        col_widths = [50, 40, 100]
        if len(cells) == 2:
            col_widths = [60, 130]
        elif len(cells) == 4:
            col_widths = [45, 30, 30, 85]

        for i, cell in enumerate(cells):
            w = col_widths[i] if i < len(col_widths) else 40
            self.cell(w, 6, str(cell), border=1, fill=True)
        self.ln()

    def bullet(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(60, 60, 60)
        x = self.get_x()
        self.cell(5, 5.5, "*")
        self.multi_cell(0, 5.5, f" {text}")
        self.ln(1)


def build_pdf():
    pdf = YuniPDF()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=20)

    # ==================== TITLE PAGE ====================
    pdf.title_page()

    # ==================== ABSTRACT ====================
    pdf.add_page()
    pdf.section_title("", "Abstract")
    pdf.body_text(
        "This paper presents the scientific foundation for Yuni, a group dating application "
        "designed to maximize romantic conversion rate -- defined as the proportion of users who, "
        "after attending a group date, meet someone from that group again with romantic intent. "
        "Drawing on meta-analytic evidence from relationship science (460+ effect sizes on "
        "similarity-attraction, Joel et al.'s unpredictability result across 43 speed-dating studies, "
        "and Feingold's matching hypothesis meta-analysis), we argue that specific romantic compatibility "
        "cannot be predicted from pre-interaction data. Instead, we optimize the CONDITIONS under which "
        "attraction emerges: attractiveness cohesion, group dynamic quality, activity-personality fit, "
        "and personality diversity. We introduce a female-first design framework grounded in the "
        "empirical finding that 45% of women leave dating apps due to safety concerns, and present "
        "the Second-Date Bridge -- a structured facilitation system that addresses the 94% attrition "
        "rate observed in speed-dating follow-through. Industry benchmarks suggest swipe apps convert "
        "at <5% (match to real date); our framework targets 27-35%."
    )

    # ==================== 1. THE PROBLEM ====================
    pdf.section_title("1", "The Conversion Problem")
    pdf.body_text(
        "The dating app industry optimizes for engagement metrics -- swipes, matches, messages -- "
        "that do not correlate with real-world romantic outcomes. The fundamental gap:"
    )
    pdf.ln(2)

    pdf.table_row(["Platform", "Match-to-Date Rate", "Source"], header=True)
    pdf.table_row(["Tinder", "<2%", "1 in 500 swipes leads to a phone number exchange"])
    pdf.table_row(["Bumble", "~5%", "70% of matches stall before plans are made"])
    pdf.table_row(["Hinge", "~8%", "Best performing swipe app"])
    pdf.table_row(["Speed dating", "4-6%", "Mutual match to actual follow-up date"])
    pdf.table_row(["Yuni (target)", "27-35%", "Group date to second date with romantic intent"], bold=True)

    pdf.ln(4)
    pdf.body_text(
        "The gap between matching and meeting is where 90%+ of potential relationships die. "
        "Conversations fizzle after 2-5 messages (industry data shows 70% of matches stall), "
        "stranger anxiety prevents follow-through, and the paradox of choice erodes commitment "
        "to any single connection. Yuni's structural advantage is that users have ALREADY MET -- "
        "eliminating the largest drop-off point in the dating funnel."
    )

    # ==================== 2. KEY FINDINGS ====================
    pdf.section_title("2", "Key Findings from Relationship Science")

    pdf.subsection_title("2.1 The Unpredictability of Romantic Chemistry")
    pdf.body_text(
        "Joel, Eastwick & Finkel (2017) conducted the definitive study on romantic prediction, "
        "applying machine learning to 100+ self-report variables across 43 speed-dating studies. "
        "Results:"
    )
    pdf.ln(2)
    pdf.table_row(["Variance Component", "R-squared", "Implication"], header=True)
    pdf.table_row(["Actor effects (your desirability)", "4-18%", "Can predict who is generally popular"])
    pdf.table_row(["Partner effects (their desirability)", "7-27%", "Can predict who is generally attractive"])
    pdf.table_row(["Relationship effects (specific pair)", "~0%", "CANNOT predict who clicks with whom"])
    pdf.ln(2)
    pdf.highlight_box(
        "Individual romantic chemistry is 0% predictable from pre-interaction data. "
        "This finding has been replicated across multiple independent studies (Eastwick & Finkel 2008, "
        "Tidwell et al. 2013, Finkel et al. 2015) and represents the scientific consensus."
    )
    pdf.body_text(
        "Implication: The algorithm's job is NOT to predict compatibility. It is to optimize the "
        "CONDITIONS under which attraction can emerge."
    )

    pdf.subsection_title("2.2 The Matching Hypothesis")
    pdf.body_text(
        "Feingold's (1988) meta-analysis found that partners' physical attractiveness ratings "
        "correlate at r = 0.49 in established couples -- one of the strongest findings in "
        "relationship science. People form relationships with others at similar attractiveness levels, "
        "not as a conscious preference, but as an equilibrium outcome of mutual selection. "
        "Groups with LOW attractiveness variance will produce more mutual interest because everyone "
        "feels 'in the same league.'"
    )

    pdf.subsection_title("2.3 Stated vs. Revealed Preferences")
    pdf.body_text(
        "Eastwick & Finkel (2008) and subsequent replications with combined N > 10,000 found that "
        "what people SAY they want in a partner does NOT predict who they are ACTUALLY attracted to. "
        "Both sexes weight physical attractiveness equally in face-to-face encounters, regardless of "
        "stated preferences. Hitsch, Hortacsu & Ariely (2010) confirmed at scale with behavioral data: "
        "stated preferences diverge from revealed behavior. This means preference-based matching "
        "(body type, height, humor style) should not be used as matching inputs."
    )

    pdf.subsection_title("2.4 What Predicts Second-Date Desire")
    pdf.body_text(
        "Second-date desire is DISTINCT from initial attraction. The strongest predictors "
        "(from Prochazkova et al. 2023, Fisman & Iyengar 2006, and Allegrini et al. 2021):"
    )
    pdf.bullet("Mutual eye contact during interaction: 270% increase in second-date desire")
    pdf.bullet("Physical synchrony (body sway coupling): predicts interest above attractiveness")
    pdf.bullet("Compatibility impressions formed DURING interaction (not pre-measured traits)")
    pdf.bullet("Displayed intelligence, humor, and sincerity in conversation")
    pdf.bullet("Respectful behavior (51.75% of women cite disrespect as instant dealbreaker)")
    pdf.ln(2)
    pdf.body_text(
        "All of these factors are observable only during face-to-face interaction, and are best "
        "surfaced by ACTIVE, COLLABORATIVE activities (escape rooms, cooking classes, trivia) "
        "rather than passive settings (dinner, drinks)."
    )

    pdf.subsection_title("2.5 Similarity-Attraction (Meta-Analysis)")
    pdf.body_text(
        "Montoya, Horton & Kirchner (2008) meta-analyzed 460 effect sizes from 313 studies. "
        "Actual similarity correlates with attraction at r = 0.47; perceived similarity at r = 0.39. "
        "Critical nuance: actual similarity is strongest BEFORE interaction (r = 0.59) and weakens "
        "dramatically during short interaction (r = 0.21). Perceived similarity remains robust. "
        "For group dates, similarity provides a reasonable baseline for comfort, but once the "
        "date starts, the interaction itself takes over."
    )

    # ==================== 3. FEMALE-FIRST ====================
    pdf.add_page()
    pdf.section_title("3", "Female-First Design Framework")

    pdf.body_text(
        "In a two-sided dating market, the scarce side determines market health. In every dating "
        "app, the scarce side is women. If women leave, the app dies -- regardless of how many men "
        "are registered. This is not philosophy; it is supply-demand economics."
    )

    pdf.subsection_title("Why Women Leave Dating Apps")
    pdf.body_text("Aggregated from Pew (2023), Cloudwards (2025), Forbes Health (2024), YouGov (2024):")
    pdf.ln(2)
    pdf.table_row(["Reason", "Percentage"], header=True)
    pdf.table_row(["Safety / harassment fears", "45% of women"])
    pdf.table_row(["Dating app burnout", "78% of Gen Z"])
    pdf.table_row(["Feeling commodified", "Qualitative (widespread)"])
    pdf.table_row(["Ghosting / low effort matches", "62% of users ghosted"])
    pdf.table_row(["Mental health impact", "Documented across studies"])

    pdf.ln(4)
    pdf.subsection_title("How Yuni Addresses Each Concern")
    pdf.bullet("Safety: GROUP FORMAT -- never alone with a stranger. University verification.")
    pdf.bullet("Burnout: ONE DATE PER WEEK -- no endless swiping. Finite, meaningful commitment.")
    pdf.bullet("Commodification: IN-PERSON FIRST -- judged on personality and behavior, not photos.")
    pdf.bullet("Ghosting: ALREADY MET -- shared experience creates investment. Auto-facilitated second date.")
    pdf.bullet("Mental health: SOCIAL EVEN WITHOUT MATCH -- you still had a fun night out with new people.")

    pdf.ln(2)
    pdf.highlight_box(
        "The group format is Yuni's moat. No swipe app can replicate the safety, social proof, "
        "and behavioral observation that a 2-3 hour group activity provides. "
        "Marketing message: 'Your first date is never alone.'"
    )

    pdf.subsection_title("Gender Ratio Management")
    pdf.body_text(
        "Dating apps typically skew 60-80% male. Research on operational sex ratios (Guttentag & "
        "Secord 1983, Pedersen 1991) shows that when men outnumber women, women become choosier "
        "and the market becomes less efficient for everyone. Maintaining a 50/50 ratio is not a "
        "nice-to-have -- it is a core product requirement. Strategies: waitlists for men when ratio "
        "exceeds 55%, referral bonuses for inviting opposite-gender friends, and female-first marketing."
    )

    # ==================== 4. OPTIMIZATION FRAMEWORK ====================
    pdf.add_page()
    pdf.section_title("4", "The Conversion Optimization Framework")

    pdf.subsection_title("Formal Definition")
    pdf.body_text(
        "Conversion rate C = P(second date | attended group date)"
    )
    pdf.body_text("Decomposed into two independent probabilities:")
    pdf.body_text(
        "C = P(mutual interest) x P(second date | mutual interest)"
    )
    pdf.ln(2)
    pdf.bold_text("Term 1: P(mutual interest)")
    pdf.body_text(
        "Optimized by the matching algorithm: attractiveness cohesion (matching hypothesis r=0.49), "
        "group dynamic quality, activity-personality fit, personality diversity, intent alignment, "
        "and absence of dealbreaker friction."
    )
    pdf.bold_text("Term 2: P(second date | mutual interest)")
    pdf.body_text(
        "Optimized by the Second-Date Bridge: low-friction date suggestion within 48 hours, "
        "venue recommendation, mutual availability detection, follow-up nudges. "
        "This is where speed dating loses 94% of its matches and where Yuni innovates."
    )

    pdf.subsection_title("Group-Level Scoring (Not Pairwise)")
    pdf.body_text(
        "Because specific pairwise chemistry is unpredictable (Joel et al. 2017), the matching "
        "algorithm scores GROUPS, not pairs. The quality function Q(G) captures the conditions "
        "under which attraction emerges:"
    )
    pdf.ln(2)
    pdf.table_row(["Component", "Weight", "Metric", "Evidence"], header=True)
    pdf.table_row(["AttCohesion", "5.0", "-variance of scores", "Feingold r=0.49"])
    pdf.table_row(["RoleDiversity", "3.0", "Unique roles + catalyst", "Group dynamics research"])
    pdf.table_row(["PersonalityDiv", "2.5", "Entropy of types", "Hedge against unpredictability"])
    pdf.table_row(["IntentAlignment", "2.0", "Same intent bonus", "Mismatched intent = no convert"])
    pdf.table_row(["EnergyBalance", "1.5", "Optimal std ~ 1.0", "Group dynamics"])
    pdf.table_row(["ActivityFit", "1.5", "Energy-activity match", "Shared experience research"])
    pdf.table_row(["ValuesBaseline", "1.5", "Moderate similarity", "Meta: r=0.47"])
    pdf.table_row(["FrictionScore", "-1.5", "Diet/logistics", "Practical"])

    pdf.ln(4)
    pdf.body_text(
        "All weights are INITIAL PRIORS. They are updated weekly from outcome data via Bayesian "
        "regression, with epsilon-greedy exploration (15% random groups) providing unbiased training "
        "data. The algorithm learns what actually drives conversion, rather than relying on "
        "hand-tuned assumptions."
    )

    # ==================== 5. THE SECOND-DATE BRIDGE ====================
    pdf.add_page()
    pdf.section_title("5", "The Second-Date Bridge")
    pdf.body_text(
        "Speed dating research (Asendorpf, Penke & Back, 2011) shows that 60-87% of participants "
        "get at least one mutual match, but only 4-6% actually date afterward. The 94% attrition "
        "between 'I like them' and 'we went on a date' is the largest value-destruction point in "
        "the dating funnel."
    )
    pdf.body_text(
        "Yuni addresses this with two structural advantages (you already met for 2-3 hours; you have "
        "shared memories) and one product innovation: the Second-Date Bridge."
    )

    pdf.subsection_title("How It Works")
    pdf.bullet("Within 48 hours of mutual match: auto-generated second-date suggestion with venue, time, activity")
    pdf.bullet("One-tap propose / one-tap accept (minimal friction)")
    pdf.bullet("If no second date after 7 days: follow-up nudge with a fresh suggestion")
    pdf.bullet("At 14 days: 'How's it going?' check-in (the gold standard conversion signal)")

    pdf.subsection_title("The Soft Match Mechanism")
    pdf.body_text(
        "When one person says 'Interested' and the other says 'Maybe,' a soft match is created. "
        "After 48 hours, the 'Maybe' person receives: 'Someone from your group is interested in "
        "seeing you again. Want to find out who?' If they tap yes, the match is revealed and a "
        "gentle chat opens. If they don't respond, the interested person is never notified. "
        "Zero embarrassment risk. This recovers an estimated 10-20% of connections that would "
        "otherwise be lost."
    )

    # ==================== 6. ONBOARDING ====================
    pdf.section_title("6", "Evidence-Based Onboarding")
    pdf.body_text(
        "Single 7-step path (~5 minutes). Every question justified by conversion evidence. "
        "Removed: attachment style (predicts long-term only), Big Five proxies, stated preferences "
        "for body type/height/humor (Eastwick: unreliable), exercise, sleep, communication preference. "
        "Added: 6-item values assessment (similarity-attraction meta: r=0.47)."
    )
    pdf.ln(2)
    pdf.bold_text("The 7 Steps:")
    pdf.bullet("Photos + Selfie verification (2 min) -- attractiveness scoring, identity")
    pdf.bullet("Basics -- age, gender, university, location (30 sec, mostly auto)")
    pdf.bullet("What You're Looking For -- intent, age range, max 3 dealbreakers (30 sec)")
    pdf.bullet("Values -- 6 binary forced-choice pairs (30 sec)")
    pdf.bullet("Vibe in Groups -- energy 1-5, single group role (30 sec)")
    pdf.bullet("Activities + Interests -- 3+ activities, up to 10 interests (1 min)")
    pdf.bullet("Prompts -- 2 of 10 (1 min)")

    # ==================== 7. ACTIVITY INTELLIGENCE ====================
    pdf.add_page()
    pdf.section_title("7", "Activity Intelligence")
    pdf.body_text(
        "Activities are not just context for the date -- they are a mechanism of attraction. "
        "Activities that create shared memories, surface personality traits (intelligence, humor, "
        "kindness), require collaboration, enable natural conversation, and generate positive "
        "emotion will produce higher conversion rates."
    )
    pdf.ln(2)
    pdf.table_row(["Activity", "Predicted Tier"], header=True)
    pdf.table_row(["Escape rooms", "Tier 1 (highest conversion)"])
    pdf.table_row(["Cooking classes", "Tier 1"])
    pdf.table_row(["Trivia nights", "Tier 1"])
    pdf.table_row(["Hiking", "Tier 2"])
    pdf.table_row(["Bowling / Mini golf", "Tier 2"])
    pdf.table_row(["Board game cafes", "Tier 2"])
    pdf.table_row(["Karaoke", "Tier 3"])
    pdf.table_row(["Bar / Drinks", "Tier 3"])
    pdf.table_row(["Dinner", "Tier 3"])
    pdf.table_row(["Art gallery / Movie", "Tier 4 (lowest)"])

    pdf.ln(4)
    pdf.body_text(
        "Note: these rankings are predictions based on the shared-experience literature, not "
        "empirical conversion data (which does not yet exist). The system is designed to track "
        "conversion by activity type and update rankings from real outcomes."
    )

    # ==================== 8. MARKETABLE STATISTICS ====================
    pdf.section_title("8", "Marketable Statistics Framework")
    pdf.body_text("Yuni tracks metrics that demonstrate real value, not vanity metrics:")
    pdf.ln(2)

    pdf.table_row(["Metric", "Target", "Industry Benchmark"], header=True)
    pdf.table_row(["Second-date rate", "27-35%", "Speed dating: 4-6%"])
    pdf.table_row(["Match rate per date", "45-55%", "Swipe apps: <5% to real date"])
    pdf.table_row(["Dates per match", "1.5-2.0", "Swipe apps: 56 matches per date"])
    pdf.table_row(["Female safety rating", ">90%", "Industry: ~55%"])
    pdf.table_row(["User NPS", ">50", "Dating apps average: 2"])
    pdf.table_row(["No-match satisfaction", ">80%", "N/A (unique to Yuni)"])

    pdf.ln(4)
    pdf.highlight_box(
        "The value proposition: '1 in 3 Yuni group dates leads to a real date. "
        "Not a match. Not a message. An actual, in-person, second date. "
        "Your first date is never alone.'"
    )

    # ==================== 9. REFERENCES ====================
    pdf.add_page()
    pdf.section_title("9", "Key References")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(60, 60, 60)

    refs = [
        "Joel, S., Eastwick, P. W., & Finkel, E. J. (2017). Is romantic desire predictable? Psychological Science, 28(10), 1478-1489.",
        "Montoya, R. M., Horton, R. S., & Kirchner, J. (2008). Is actual similarity necessary for attraction? A meta-analysis. JSPR, 25(6), 889-922. [460 effect sizes, 313 studies]",
        "Feingold, A. (1988). Matching for attractiveness in romantic partners. Psychological Bulletin, 104(2), 226-235. [Meta-analysis]",
        "Eastwick, P. W., & Finkel, E. J. (2008). Sex differences in mate preferences revisited. JPSP, 94(2), 245-264.",
        "Eastwick, P. W., et al. (2014). The predictive validity of ideal partner preferences: A review and meta-analysis. Psychological Bulletin, 140(3), 623-665.",
        "Hitsch, G. J., Hortacsu, A., & Ariely, D. (2010). What makes you click? American Economic Review, 100(1), 130-163.",
        "Prochazkova, E., et al. (2023). Eye contact and romantic interest in speed dating. Archives of Sexual Behavior.",
        "Allegrini, A., et al. (2021). Body sway predicts romantic interest. PMC.",
        "Fisman, R., Iyengar, S. S., et al. (2006). Gender differences in mate selection. QJE. [Columbia/Stanford speed-dating]",
        "Asendorpf, J. B., Penke, L., & Back, M. D. (2011). From dating to mating and relating. Personal Relationships, 18(3), 312-325.",
        "Aron, A., et al. (1997). Experimental generation of interpersonal closeness. PSPB, 23(4), 363-377.",
        "Dunbar, R. I. M. (2010). How Many Friends Does One Person Need? Harvard University Press.",
        "Schwartz, B. (2004). The Paradox of Choice. HarperCollins.",
        "Pew Research Center (2023). The experiences of U.S. online daters.",
        "Cloudwards (2025). Dating app safety survey. [45% of women cite harassment]",
        "Forbes Health (2024). Gen Z dating app burnout survey. [78% burnout rate]",
        "Dimant, E. (2019). Social norms meta-analysis. Nature Human Behavior. [89 studies, n=85,759]",
        "Guttentag, M., & Secord, P. F. (1983). Too Many Women? The Sex Ratio Question. Sage.",
        "Dutton, D. G., & Aron, A. P. (1974). Arousal and attraction. JPSP. [Note: mixed replications]",
    ]
    for i, ref in enumerate(refs, 1):
        pdf.multi_cell(0, 4.5, f"[{i}] {ref}")
        pdf.ln(1.5)

    # Save
    output_path = "/Users/erkanuysal/Desktop/dating_app/documentation/research_summary.pdf"
    pdf.output(output_path)
    print(f"PDF generated: {output_path}")
    print(f"Pages: {pdf.page_no()}")


if __name__ == "__main__":
    build_pdf()
