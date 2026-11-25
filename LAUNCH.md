# Launch steps

How to take this repo live: GitHub, then Netlify, then DNS. Do the parts in order. DNS is last, and nothing changes for visitors or email until then.

Screen labels in GitHub and Netlify move around. If a label below doesn't match exactly, look for the nearest one with the same meaning.

## 1. GitHub: create the repo and push

1. Go to https://github.com/new.
2. Owner: your account (or the company organization, if you have one). Repository name: `dfh-website`. Visibility: **Public**. Leave "Add a README", ".gitignore" and "license" all off, because the repo already has its own. Click **Create repository**.
3. In a terminal, from this folder:

   ```sh
   git remote add origin https://github.com/OWNER/dfh-website.git
   git push -u origin main
   ```

   Replace `OWNER` with the account or organization name. If Git asks for a password, use a GitHub personal access token or sign in through the GitHub Desktop or VS Code prompt.
4. Open the **Actions** tab. The **Checks** workflow runs on the push. Wait for the green check. The first run also registers the `checks` status for step 6.
5. Add Michael: **Settings** > **Collaborators** > **Add people** > his GitHub username > role **Write**.
6. Protect `main`: **Settings** > **Rules** > **Rulesets** > **New ruleset** > **New branch ruleset**.
   - Ruleset name: `Protect main`. Enforcement status: **Active**.
   - Target branches: **Add target** > **Include default branch**.
   - Turn on **Restrict deletions** and **Block force pushes**.
   - Turn on **Require a pull request before merging**. Required approvals: **1**.
   - Turn on **Require status checks to pass**. Click **Add checks**, type `checks`, and pick the one from GitHub Actions.
   - Leave the bypass list empty. Click **Create**.

From now on every change goes through a pull request. The other partner approves it, and it merges only when Checks passes.

## 2. Netlify: import the repo

1. Sign in at https://app.netlify.com with GitHub.
2. Put the team on the Personal plan: **Team settings** > **Billing** > change plan to **Personal** ($9 a month).
3. **Add new project** > **Import an existing project** > **GitHub**. When GitHub asks which repositories Netlify may see, choose **Only select repositories** > `dfh-website`.
4. Pick `dfh-website`, branch `main`. The build settings fill in from `netlify.toml`: build command `npm run build`, publish directory `dist`. Leave them. Click **Deploy**.
5. Rename the project under **Project configuration** > **General** > **Project details** > **Change project name**, for example `dfh-website`. The preview address becomes `https://dfh-website.netlify.app` (if the name is free).
6. Confirm the Node version: open **Deploys**, click the deploy, and read the log. Near the top it should say it is using Node from `.nvmrc`, version 24. If it shows another version, add an environment variable `NODE_VERSION` = `24` under **Project configuration** > **Environment variables** and redeploy.

### Forms

1. Open **Forms** in the project and click **Enable form detection**.
2. Redeploy so Netlify finds the form: **Deploys** > **Trigger deploy** > **Deploy project**.
3. Back in **Forms**, a form named `contact` should be listed. Spam filtering is on by default, and the form already has a honeypot field.
4. Email notifications: **Project configuration** > **Notifications** > **Emails and webhooks** > **Form submission notifications** > **Add notification** > **Email notification**.
   - Event: new form submission. Email to notify: `chris@data-for-humans.com`. Form: `contact`. Save.
   - Add a second notification the same way for `michael@data-for-humans.com`.

### Analytics

Open the project's **Analytics** (or **Observability**) section and enable **Web analytics**. It is cookieless, so no consent banner is needed. On the Personal plan it keeps seven days of history.

### Deploy previews

1. Check **Project configuration** > **Build & deploy** > **Continuous deployment** > **Branches and deploy contexts**. Deploy previews should be set to **Any pull request against your production branch** (the default).
2. Test it: make a branch, change one word in a note, push, and open a pull request. Within a couple of minutes Netlify comments on the PR with a preview link, and Checks runs. Close the PR without merging when you're done.

Deploy previews are free. Each production deploy (every merge to `main`) costs 15 of the plan's 1,000 monthly credits.

### Daily rebuild hook

The site decides which events are upcoming when it builds. A scheduled rebuild moves an event to "past" the morning after it happens.

1. In Netlify: **Project configuration** > **Build & deploy** > **Continuous deployment** > **Build hooks** > **Add build hook**. Name: `Daily rebuild`. Branch: `main`. Save, then copy the URL.
2. In GitHub: **Settings** > **Secrets and variables** > **Actions** > **New repository secret**. Name: `NETLIFY_BUILD_HOOK_URL`. Secret: paste the URL. Click **Add secret**. Don't paste the URL anywhere else, because anyone with it can trigger builds.
3. Test it: **Actions** > **Daily rebuild** > **Run workflow**. A new deploy should appear in Netlify, labeled as triggered by the hook.

The schedule is in `.github/workflows/daily-rebuild.yml`. GitHub cron runs in UTC:

| Central time | Offset | 5:17 am Central in UTC |
| --- | --- | --- |
| Daylight time (March to November) | UTC-5 | 10:17 |
| Standard time (November to March) | UTC-6 | 11:17 |

The workflow uses **10:17 UTC**: 5:17 am in summer and 4:17 am in winter, so the rebuild is never later than 5:17 am local time.

The job runs every morning but rebuilds only on the morning after an event (`ONLY_AFTER_EVENTS: 'true'` in the workflow file), the only time the schedule changes what the site shows. Rebuilding every day would cost about 450 credits a month. On other days the run ends with "No event ended yesterday; no rebuild needed." Running it by hand from the Actions tab always rebuilds. GitHub also pauses schedules in a public repo after 60 days with no commits. It emails the owner, and you turn it back on under **Actions**.

### Before DNS

Both partners review the preview address and approve. Also try Home and Contact with the keyboard only (Tab, Shift+Tab, Enter) and with VoiceOver (Cmd+F5 on a Mac).

## 3. DNS cutover (do this yourself)

The domain stays registered at WordPress.com. Only the website records for the root and `www` change. Every email record stays exactly as it is, so Google Workspace keeps working.

### a. Snapshot every record first

At least a day ahead:

1. WordPress.com > **Upgrades** > **Domains** > `data-for-humans.com` > **DNS records**. Screenshot every record, including the default ones WordPress.com manages for you.
2. Also save the records as text. Run this and keep the file outside the repo:

   ```sh
   {
     for t in A AAAA MX TXT NS CAA; do dig +noall +answer data-for-humans.com $t; done
     dig +noall +answer www.data-for-humans.com CNAME
     dig +noall +answer www.data-for-humans.com A
     dig +noall +answer google._domainkey.data-for-humans.com TXT
     dig +noall +answer _dmarc.data-for-humans.com TXT
   } > ~/dfh-dns-snapshot-$(date +%Y-%m-%d).txt
   ```

   Check the file has the MX records (Google), the SPF TXT record (`v=spf1 ...`), DKIM (`google._domainkey`), DMARC (`_dmarc`) and any `google-site-verification` TXT record.
3. In Google Search Console, confirm the domain is verified with a DNS TXT record, and export the current list of indexed pages.

### b. Lower the TTLs

A day ahead, set the TTL on the root A records and the `www` record to **300 seconds**. If WordPress.com won't let you edit the TTL on its default records, note the TTL it shows. During the cutover, expect changes to take that long to reach everyone.

### c. Add the domain in Netlify

1. Netlify project > **Domain management** > **Add a domain** > `data-for-humans.com` > **Verify** > **Add domain**.
2. If Netlify offers to set up Netlify DNS or change your nameservers, **decline**. DNS stays at WordPress.com.
3. Make sure `www.data-for-humans.com` is listed too, and that `data-for-humans.com` is the **primary domain**. Then `www` redirects to the root.
4. Netlify now shows "Awaiting external DNS", with the exact A record and CNAME target to use. Use what it shows. The A record is normally Netlify's load balancer, `75.2.60.5`.

### d. Change only the root and www records

At WordPress.com > DNS records:

1. Remove the WordPress.com A records for the root (`@`). If there is an AAAA record for the root, remove that too, or IPv6 visitors will still reach the old site.
2. Add an **A** record: name `@`, value `75.2.60.5` (or what Netlify showed), TTL 300.
3. Change the `www` record to a **CNAME** pointing to your Netlify address, such as `dfh-website.netlify.app`, TTL 300.
4. Leave everything else alone: **MX**, the **SPF** TXT, **DKIM** (`google._domainkey`), **DMARC** (`_dmarc`), the **Google site verification** TXT, and any other record.

### e. Verify

1. DNS:

   ```sh
   dig +short data-for-humans.com A          # 75.2.60.5
   dig +short www.data-for-humans.com CNAME  # your .netlify.app address
   dig +short data-for-humans.com MX         # same as the snapshot
   dig +short data-for-humans.com TXT        # same as the snapshot
   ```

2. HTTPS: Netlify > **Domain management** > **HTTPS** > **Verify DNS configuration**. Netlify issues a free certificate once DNS checks out, which can take up to an hour.
3. Pages and old URLs:

   ```sh
   curl -sI https://data-for-humans.com/ | head -1                      # 200
   curl -sI http://data-for-humans.com/ | grep -i location              # https://data-for-humans.com/
   curl -sI https://www.data-for-humans.com/ | grep -i location         # https://data-for-humans.com/
   curl -sI https://data-for-humans.com/our-work/ | grep -i location    # /work/
   curl -sI https://data-for-humans.com/blog/ | grep -i location        # /notes/
   curl -sI https://data-for-humans.com/2024/01/16/rethinking-data-transformation-a-call-for-agile-data-practices/ | grep -i location  # /notes/
   curl -sI https://data-for-humans.com/feed/ | grep -i location        # /notes/rss.xml
   curl -sI https://data-for-humans.com/sitemap.xml | grep -i location  # /sitemap-index.xml
   curl -sI https://data-for-humans.com/wp-content/uploads/2022/01/strengthsfinder.pdf | head -1  # 410
   ```

4. Form: send a real message through https://data-for-humans.com/contact/. You should land on the thank-you page. The message should appear under Netlify **Forms** > `contact`, and the email should reach both chris@ and michael@. Check spam folders the first time.
5. Email in both directions: from a personal address, send one message each to chris@ and michael@. Then reply from each to the personal address. Both should arrive.

### f. Rollback

If something breaks during cutover:

1. At WordPress.com DNS, delete the Netlify A record and set `www` back to what the snapshot shows.
2. Restore the WordPress.com A records (and AAAA, if there was one) from the snapshot. WordPress.com may offer a button to restore its default records.
3. With a 300 second TTL, most visitors are back on the old site within minutes. Email is never affected, because the MX and TXT records were never touched.

The old WordPress site keeps running until the plan is canceled, and the Netlify project keeps running too, so you can try the cutover again later.

## 4. After launch

1. **Search Console:** **Sitemaps** > submit `https://data-for-humans.com/sitemap-index.xml`. Watch **Pages** for crawl errors for two weeks.
2. **Old form messages:** before canceling WordPress, open WP Admin > **Feedback**, export the 13 real messages to CSV, and keep the file outside this repo. Then delete the spam.
3. **WordPress hosting:** wait one week of clean traffic in Netlify analytics. Then downgrade or cancel the WordPress.com plan. Before you do, open **Upgrades** > **Domains** and make sure `data-for-humans.com` has **auto-renew on** with a valid card. If canceling asks about the domain, keep it.
4. **Look-alike domains:** point them at the main site with registrar forwarding or Netlify domain aliases, or let them lapse.
5. **LinkedIn:** update the company page with the new tagline and links.
6. **Outside sites:** when footprintreview.com and relayered.design load, set `live: true` for each in `src/data/site.ts`.
