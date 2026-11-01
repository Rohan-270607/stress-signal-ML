# Worked examples (held-out test set)

Scores are the model's 0-1 stress-signal score; 'annotator label' is the Dreaddit crowd label (1 = stress). The last example is a deliberate model error.

## Example 1
> Okay this is driving totally insane and I can't function normally because of it, I have had intrusive thoughts basically for as long as I can remember, though now they are pushing me closer and closer to insanity. I am only focusing on one disturbing thought now which I really only need serious and helpful answers for. To start off, I remember it being the start off 2015 and I was sleeping over at my best friends house who we will call "J". Now J and I would always stay up all night when having sleepovers, and this certain night I managed to pull through to 6:30 am 30 minutes after J had falle...

- **score:** 0.706  |  **model label:** higher_signal  |  **annotator label:** 1
- Longer text than typical increased the signal. (+1.39 log-odds)
- Lower use of negative-emotion words than typical decreased the signal. (-0.73 log-odds)
- Fewer question marks than typical decreased the signal. (-0.12 log-odds)
- Lower use of negation words (not, no, n't) than typical decreased the signal. (-0.08 log-odds)

## Example 2
> So im feeling a bit defeated; I finally went to my dr at the beginning of last month about my PPD and anxiety, also my workplace is very stressful and my marriage feels like it's crumbling because we are always arguing... my dr prescribed me Zoloft, I really wish now I had journaled how it made me feel, but thinking back, I had some nausea and then started to feel anxiety relief within a week, and overall better mood in a few weeks. Last week, I was working nights and forgot to take my Zoloft four days in a row... I went into a crisis/withdrawal, started taking it again and on day three I felt...

- **score:** 0.832  |  **model label:** higher_signal  |  **annotator label:** 1
- Longer text than typical increased the signal. (+0.69 log-odds)
- Higher use of first-person singular pronouns (I, me, my) than typical increased the signal. (+0.66 log-odds)
- Higher use of negative-emotion words than typical increased the signal. (+0.31 log-odds)
- Lower use of negation words (not, no, n't) than typical decreased the signal. (-0.28 log-odds)

## Example 3
> **Remember Need to Know**. Only tell people about your plans if they absolutely need to know and can be trusted. Limit the number of people that know your plan; even if you trust them, they may be tricked into giving up your location **Be careful of your browsing history**. Most browsers keep a record of websites you visit.

- **score:** 0.041  |  **model label:** lower_signal  |  **annotator label:** 0
- Lower use of first-person singular pronouns (I, me, my) than typical decreased the signal. (-1.80 log-odds)
- Lower use of negative-emotion words than typical decreased the signal. (-1.05 log-odds)
- Shorter text than typical decreased the signal. (-0.30 log-odds)
- Lower use of negation words (not, no, n't) than typical decreased the signal. (-0.28 log-odds)

## Example 4
> My university holiday is over in a week. I've been submitting resumes online for 3 months and haven't gotten a single response. It's understandable since I'm applying for pharmacy assistance job which is highly competitive. I've been reading "Rejection Proof" by Jia Jiang where the author tries to get rejected once a day and vlogs the entire thing in order to face his fear of rejection. One day, he decides to find a job but only work for a day.

- **score:** 0.328  |  **model label:** lower_signal  |  **annotator label:** 0
- Lower use of first-person singular pronouns (I, me, my) than typical decreased the signal. (-0.85 log-odds)
- Fewer question marks than typical decreased the signal. (-0.12 log-odds)
- Lower use of negation words (not, no, n't) than typical decreased the signal. (-0.11 log-odds)
- Shorter text than typical decreased the signal. (-0.06 log-odds)

## Example 5
> I've been dating this guy for a few months, and we've recently become official. He's wonderfully kind, intelligent, and we get along incredibly well. We have some deep conversations about our lives and the struggles we've endured, and I admire him. I haven't told him about my PTSD, mostly because I've been doing really well with managing it; this time last year, I was having panic attacks, flashbacks, hypervigilance, etc but I've been doing so great this year. My ex was the first person to know about my abuse, mostly because I was still suffering and couldn't hide it.

- **score:** 0.566  |  **model label:** higher_signal  |  **annotator label:** 0
- Lower use of negative-emotion words than typical decreased the signal. (-0.17 log-odds)
- Longer text than typical increased the signal. (+0.17 log-odds)
- Fewer question marks than typical decreased the signal. (-0.12 log-odds)
- Higher use of first-person singular pronouns (I, me, my) than typical increased the signal. (+0.10 log-odds)
