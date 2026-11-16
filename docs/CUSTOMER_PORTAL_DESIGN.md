# Customer portal release design

Banking service requests, with one visible next action and a calm document trail.

Palette: banking red #C8102E; ink #17212B; white #FFFFFF; canvas #F5F7F9;
muted slate #556270; confirmation green #146C43. Existing Inter/Segoe UI provides
readable body text and semibold headings; no new remote font dependency.

Layout: left-aligned page title and short explanation, next action, then request
list. Four persistent destinations: Home, New request, My requests, Profile.

    Home + New request        My requests        Profile
    Welcome, customer         [New request]
    [Your action, if needed]
    Recent requests: type / status / view

Review against brief: remove the repeated metric dashboard, technical timeline,
uppercase metadata, raw IDs and delivery internals. Retain synthetic-demo notice,
request date and a collapsible reference/history. Address search belongs inside
the service eForm, which already shares supporting-document validation and the
reviewer-to-Operations route. Existing dedicated address records remain accessible
as a separate history rather than masquerading as that document workflow.

Controls: no inferred completion at Operations, no change to backend findings or
approval policy, and no activation of draft OneMap rules. Closed navigation is
unmounted. Interactive targets are at least 44px, with visible keyboard focus.
