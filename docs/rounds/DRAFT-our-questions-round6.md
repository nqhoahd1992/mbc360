# MBc360 — Follow-up questions, Round 6

**For:** the subject-matter team (NPD / Quality / Regulatory / Safety)

This round has three questions. They follow from your answers to questions 1 and 37 of Round 5. Question 1 asks how we should read the way the reviewer names are written; question 2 asks you to check a page that lists every role and what it is authorised to do; question 3 asks who may be named to hold a function on a project.

Where we say "the software development team" we mean the team building this application — not the owner of any product development project.

You can reply by letter, for example "(a) — yes, (b) — row 3 should be …, (c) — option (ii)".

---

## Question 1 — How should we read the reviewer names in the "Acknowledgement function" column?

*Where in the application:* On the **New Project** form (**All Projects** page) the **Functions** section lists who holds each function on a project. On a gate's tab of a **Phase** page, a "not applicable" reason that the system wrote for a critical item is acknowledged by the person who holds the function you named for that item, and it shows "Unassigned" while nobody holds it.

In the table in your answer 1(a) you named who has to acknowledge each critical item. The names are written in several shapes:

- plain function names: *Safety*, *Regulatory*, *Quality*;
- a function with a word after a slash: *Quality / microbiology reviewer*, *Quality / post-market reviewer*, *Quality / change-control reviewer*, *Safety / study reviewer*;
- two functions joined with "with", "and" or ";": *Safety with Regulatory*, *Quality with Manufacturing / R&I*;
- two or three names that stand alone: *Authorised human-study reviewer*, *Technical claims reviewer*, *R&I / Marketing*.

You did not say how these relate to each other, so the software development team has to choose. We noticed one pattern in how you wrote them and we have built on it. **We want to check that we read it correctly, because it decides who is allowed to acknowledge an item.**

**Our reading.** A word that starts with a **capital letter** names a **function that stands on its own**. A word in **lower case after a slash** names a **specialist who sits inside** the function written before the slash. So *Quality / microbiology reviewer* is a Quality person who covers microbiology, and *Safety / study reviewer* is a Safety person who covers studies. A name with no function in front of it (*Authorised human-study reviewer*, *Technical claims reviewer*) we have **kept as its own function with exactly your wording**, because you did not say which function it belongs to.

| Name in your table | How we read it | Right? Or what should it be? |
|---|---|---|
| Safety | A function on its own | |
| Regulatory | A function on its own | |
| Quality | A function on its own | |
| Quality / microbiology reviewer | A specialist inside **Quality** (for *Preservative strategy*, *Preservative efficacy status*) | |
| Quality / post-market reviewer | A specialist inside **Quality** (for *Scheduled market feedback review*, *Baseline post-market surveillance*) | |
| Quality / change-control reviewer | A specialist inside **Quality** (for *Change-control links*) | |
| Safety / study reviewer | A specialist inside **Safety** (for *Infant testing triggered by use and risk*) | |
| Authorised human-study reviewer | Its own function, no function named in front of it (for *Human-study approval before recruitment*) | |
| Technical claims reviewer | Its own function, no function named in front of it (for *Product-performance evidence*) | |
| Manufacturing / R&I | Two separate functions, either of which may acknowledge (for *Scale-up / pilot status*, alongside Quality) | |

**(a)** Is this the right way to read the capital letters and the lower-case words? If not, how should they be read?

**(b)** Please correct any row of the table above that we have read wrongly.

**(c)** Where a specialist is named — for example *Quality / microbiology reviewer* — who may acknowledge that item?

- (i) Only the person who holds that specialism. A person who holds *Quality* but not the specialism may not acknowledge it. *This is what we have built.*
- (ii) Either the person who holds the specialism or the person who holds the function it sits in (here, *Quality*).
- (iii) The person who holds the function it sits in, and the specialist only where one has been named for the project.
- (iv) Something else (please describe).

**(d)** For the two names with no function in front of them, does either belong inside one of the functions you listed in answer 37(b)?

- *Authorised human-study reviewer* — does it sit inside **Clinical / Study Coordinator**?
- *Technical claims reviewer* — does it sit inside **Technical Claims**?

**What we have built, so you can see the effect.** The four specialists and the two stand-alone names are each a separate field on the New Project form, and none of those six is required: a project may leave one empty and it then shows as **Unassigned**, and the item waits until somebody is named, as you asked in answer 37(b). We have **not** treated a Quality person as able to stand in for *Quality / microbiology reviewer*, and we have **not** treated *Authorised human-study reviewer* or *Technical claims reviewer* as the same as the functions you listed in 37(b). If you answer differently, we change who may acknowledge each item.

---

## Question 2 — Please check the page that lists every role and what it is authorised to do

*Where in the application:* On a project, **System Guide & Reference** in the sidebar, then **Role & Authority Matrix**. It is read-only and is generated from the same settings the application uses, so it cannot show something the application does not do. We can also send you a copy of the page.

In answer 37(b) you asked us to record the authorised role matrix and the named assignments. The page does this. For every role a project can name, it shows:

- whether the role is named when the project is created or left optional;
- who holds it on this project (or Unassigned);
- how many sheets it owns, co-reviews and co-signs;
- which "not applicable" reasons it acknowledges (from your answer 1(a)), and which other role must acknowledge the same reason with it;
- any other authority it has.

Below that the page lists the authority that does not belong to a role but to the project's assignments, and the independent function required at each critical gate.

**(a)** Please read the page. Is each role's authority correct? Please tell us what is wrong or missing.

**(b)** The page lists seven kinds of authority that follow the project's assignments rather than a role. Please confirm or correct each:

| Action | Who may do it today | Right? Or what should it be? |
|---|---|---|
| Record a gate's decision, or backtrack from it | The person nominated as "Approved by" for that gate, the project Lead, or an administrator | |
| Approve a phase | The person the project Lead nominated for that row | |
| Change a market's PIF, regulatory, claims and launch approvals | The project's Regulatory and Project Manager people, the project Lead, or an administrator | |
| Confirm that an old formula version is superseded in a market | The project Lead, or an administrator | |
| Nominate who signs a phase or a gate | The project Lead, or an administrator | |
| Assign or change who holds a function on the project | The project Lead, or an administrator | |
| Acknowledge a "not applicable" reason the system wrote | The person holding the function named for that item | |

---

## Question 3 — Who may be named to hold a function on a project?

*Where in the application:* On the **New Project** form (**All Projects** page), the **Functions** section; and the **Project team** card on a project's overview, where the project Lead can name or change who holds a function.

In answer 37(b) you said to "allow the project Lead to nominate authorised people **from the company role matrix**". We are not sure what the company role matrix is, so we have not built the limit it may imply.

Our reading is that it is the company-wide list of roles you gave us in answer F6 (21 July): Project Owner, R&I/Formulation Contributor, Safety Reviewer, Quality Reviewer, Regulatory Reviewer, Packaging/Artwork Contributor, Marketing/Sales Contributor, Supply Chain Contributor, Manufacturing Link Contributor, Study Author, Department Study Reviewer, Independent Study Reviewer, Published Information Technical Reviewer, Published Information Regulatory Reviewer, Final Approver, System Administrator and Read-only Viewer. Each person in the application is given one of these roles by an administrator. On that reading, when the Lead names the person who holds a function, the choice would be limited to people who hold a matching company role — for example only a Safety Reviewer for *Safety / Scientific Review*.

**What we have built.** When the Lead names the person who holds a function, the list offers **every active user**, whatever company role that person has. We did this because the functions in your answers do not line up one-to-one with the 17 roles, and a strict limit would have left some functions with nobody to choose. The consequence is that, for example, a person whose company role is *Read-only Viewer* can currently be named as *Safety / Scientific Review*.

**(a)** Is "company role matrix" the list of 17 roles from answer F6? If not, what is it?

**(b)** When the Lead names who holds a function, should the choice be:

- (i) limited to people who hold a matching company role;
- (ii) open to anyone, but with a visible warning when the person does not hold a matching company role;
- (iii) open to anyone, as it is now;
- (iv) something else (please describe).

**(c)** If the choice is limited (or warned), which company role or roles may hold each function? Please fill in the right-hand column. Four of the functions have no obvious match in the list of 17: *Clinical / Study Coordinator*, *Finance*, *Legal / IP* and *Commercial approver*.

| Function | Company role(s) that may hold it |
|---|---|
| Safety / Scientific Review | |
| Clinical / Study Coordinator | |
| Technical Claims | |
| Regulatory Claims | |
| Manufacturing | |
| Finance | |
| Legal / IP | |
| Commercial approver | |
| Authorised human-study reviewer | |
| Technical claims reviewer | |
| Quality / microbiology reviewer | |
| Quality / post-market reviewer | |
| Quality / change-control reviewer | |
| Safety / study reviewer | |

**(d)** For a function with no matching role in the list of 17, should a new company role be added, or may the Lead name anyone?
