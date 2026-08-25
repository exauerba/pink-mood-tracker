# bloom
## A minimalist, pastel mood & symptom tracker

[![Live app](https://img.shields.io/badge/Live_app-github_pages-ec4899?style=for-the-badge&logo=github&logoColor=white)](https://exauerba.github.io/pink-mood-tracker/)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy_Me_A_Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/exauerba)

Mood remembered is not mood experienced. Memory smooths, exaggerates, and rewrites emotion — bloom captures how you feel *in the moment*, several times a day, in a few taps, and turns those moments into patterns you can see.

## Try it live

bloom runs entirely in your browser and is deployed to GitHub Pages:

### <https://exauerba.github.io/pink-mood-tracker/>

It's a PWA: open it once, add it to your home screen, and it works offline like a native app — no app store, no install step. No account is needed to use it; accounts exist only to sync your data between your own devices.

## What it does

- **Track** — time-stamped check-ins through the day. Rate your own customizable trackers on a 1–7 scale (mood, energy, anxiety, sleep, focus, cravings — whatever matters to you) and add a free-text note about how it feels right now.
- **Visualize** — see your check-ins as trend lines with a 7-day average and a shaded "typical range" band, so a real shift is distinguishable from ordinary ups and downs. Scales are auto-normalized (higher = better), with 1W / 1M / 3M / custom ranges.
- **Understand** — built-in insights: which coping days tracked with better mood ("What helped"), time-of-day patterns, and links between trackers — with an honest note that correlation is not causation.
- **Stay in control** — export or import all your data as a JSON file, or delete your account and everything with it, any time.

## Why tracking works — the empirical foundation

bloom's design isn't just aesthetic; it mirrors practices that research links to better emotional wellbeing.

**In-the-moment data beats memory.** Retrospective mood reports are systematically biased toward the day's peak and its most recent moments [2], and the bias is stronger in people with depressive symptoms [3]. Sampling mood in the moment, repeatedly — the Ecological Momentary Assessment (EMA) method — minimizes recall bias and captures experience in real contexts [1][4]. That is exactly what time-stamped check-ins do.

**Self-monitoring is itself a gentle intervention.** Recording your state is a core component of cognitive-behavioral therapy [5][6]. In a randomized trial, mobile self-monitoring alone raised emotional self-awareness, which in turn reduced depressive symptoms [7]. Attention alone begins to change the pattern.

**The more precisely you name a feeling, the better you can handle it.** Emotion differentiation — telling "anxious" apart from "overwhelmed" — predicts more effective regulation [8] and less binge drinking, aggression, and self-injury [9], and it is trainable: repeatedly rating emotions measurably increases it [10].

**Patterns you can see beat patterns you can't.** Day-to-day sleep–mood links and time-of-day variation are real, but invisible to a nightly recap [11][12][13]. Reflection — turning collected data into insight — is the stage where self-tracking pays off [14][15].

**A baseline that's yours, not someone else's.** The "typical range" band gives you a personal baseline, so deviations are judged against your own norm — the difference between "am I having a bad day?" and "is something changing?"

## Privacy

Your moods are nobody's business but yours. Entries sync only to your own account (via Supabase) so they follow you between devices; export and delete are always one tap away. Health data ranks among the data people are most reluctant to share [16][17][18] — bloom is built so you never have to.

## Tech stack

- Vanilla HTML / CSS / JS — no framework, no build step
- Chart.js for visualization
- Supabase (auth + sync); see `supabase/` for the account-deletion edge function
- Service worker for offline use, auto-refreshing on every deploy
- Deployed via GitHub Actions to GitHub Pages

## Local development

Serve the repo root with any static server:

```sh
npx serve .
```

Everything runs locally. Cloud sync additionally needs the Supabase config in `supabase-config.js`.

## Support

bloom is free and open. If it helps you notice your patterns, you can [buy me a coffee](https://buymeacoffee.com/exauerba).

## References

1. [Ecological momentary assessment](https://consensus.app/papers/details/ea6ab68e982951a8bed8a9568dca7567/) — Shiffman, S., Stone, A. A., & Hufford, M. R. (2008). *Annual Review of Clinical Psychology, 4*, 1–32.
2. [How was your day? Convergence of aggregated momentary and retrospective end-of-day affect ratings across the adult life span](https://consensus.app/papers/details/13af5559eef75353b0bae487c57cd2f1/) — Neubauer, A. B., et al. (2019). *Journal of Personality and Social Psychology*.
3. [Affect recall bias: Being resilient by distorting reality](https://consensus.app/papers/details/08e383bcf94555bd86abda13a095af96/) — Colombo, D., et al. (2020). *Cognitive Therapy and Research*.
4. [Evaluation of pressing issues in ecological momentary assessment](https://consensus.app/papers/details/b7abf4575d9f500cbf48bb331fc38eef/) — Stone, A. A., Schneider, S., & Smyth, J. M. (2023). *Annual Review of Clinical Psychology, 19*, 107–131.
5. [An overview of self-monitoring research in assessment and treatment](https://doi.org/10.1037/1040-3590.11.4.415) — Korotitsch, W. J., & Nelson-Gray, R. O. (1999). *Psychological Assessment, 11*(4), 415–425.
6. [Using self-monitoring: Implementation of collaborative empiricism in cognitive-behavioral therapy](https://doi.org/10.1016/j.cbpra.2012.06.002) — Cohen, J. S., et al. (2013). *Cognitive and Behavioral Practice, 20*(4), 419–428.
7. [Self-monitoring using mobile phones in the early stages of adolescent depression: Randomized controlled trial](https://doi.org/10.2196/jmir.1858) — Kauer, S. D., et al. (2012). *Journal of Medical Internet Research, 14*(3), e67.
8. [Knowing what you're feeling and knowing what to do about it: Mapping the relation between emotion differentiation and emotion regulation](https://doi.org/10.1080/02699930143000239) — Barrett, L. F., Gross, J., Christensen, T. C., & Benvenuto, M. (2001). *Cognition and Emotion, 15*(6), 713–724.
9. [Unpacking emotion differentiation](https://doi.org/10.1177/0963721414550708) — Kashdan, T. B., Barrett, L. F., & McKnight, P. E. (2015). *Current Directions in Psychological Science, 24*(1), 10–16.
10. [Emotional granularity increases with intensive ambulatory assessment](https://doi.org/10.3389/fpsyg.2021.704125) — Hoemann, K., Barrett, L. F., & Quigley, K. S. (2021). *Frontiers in Psychology, 12*, 704125.
11. [Reciprocal relationships between daily sleep and mood: A systematic review of naturalistic prospective studies](https://doi.org/10.1016/j.smrv.2018.05.005) — Konjarski, M., Murray, G., Lee, V. V., & Jackson, M. L. (2018). *Sleep Medicine Reviews, 42*, 47–58.
12. [Relationship between sleep quality and mood: Ecological momentary assessment study](https://doi.org/10.2196/12613) — Triantafillou, S., et al. (2019). *JMIR Mental Health, 6*(3), e12613.
13. [Smartphone-based ecological momentary assessment of well-being: A systematic review](https://consensus.app/papers/details/7b13efd7af445b2d9998bed282d6a71c/) — de Vries, L. P., et al. (2020). *Journal of Happiness Studies*.
14. [A stage-based model of personal informatics systems](https://doi.org/10.1145/1753326.1753409) — Li, I., Dey, A., & Forlizzi, J. (2010). *CHI '10*, 557–566.
15. [Engagement in mobile phone app for self-monitoring of emotional wellbeing predicts changes in mental health: MoodPrism](https://doi.org/10.1016/j.jad.2017.11.016) — Bakker, D., & Rickard, N. (2018). *Journal of Affective Disorders, 227*, 432–442.
16. [Americans consider certain kinds of data to be more sensitive than others](https://www.pewresearch.org/internet/2014/11/12/americans-consider-certain-kinds-of-data-to-be-more-sensitive-than-others/) — Madden, M. (2014). Pew Research Center.
17. [Most Americans want to share and access more digital health data](https://www.pew.org/en/research-and-analysis/issue-briefs/2021/07/most-americans-want-to-share-and-access-more-digital-health-data) — Pew Charitable Trusts. (2021).
18. [Americans and privacy: Concerned, confused and feeling lack of control over their personal information](https://www.pewresearch.org/internet/2019/11/15/americans-concerned-feel-lack-of-control-over-personal-data-collected-by-both-companies-and-the-government/) — Auxier, B., et al. (2019). Pew Research Center.

## Credits

This project was vibe-coded in collaboration with a DeepSeek agentic model via OpenCode CLI.
