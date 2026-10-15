# Tabu

Static website for Tabu, built with HTML, CSS, and JavaScript.

## Local preview

Run `python3 -m http.server 8080` in this directory, then open http://localhost:8080.

## Hosting

Deploy the repository root to a static hosting provider. No build command is needed; the entry point is `index.html`.

A purchased domain can be connected using the hosting provider's custom domain settings and the DNS records it provides.

GitHub Pages restricts use as free hosting for an online business. Review https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits before selecting it for this business website.

## Contact details

Before launch, replace `CONTACT_EMAIL` in `script.js` and the fallback email link in `index.html` with a working inbox. The current value is `hello@tabu.com`.

The contact form opens the visitor's email application with a prepared message. It does not submit messages to a server.

## WhatsApp contact

Set `CONTACT_WHATSAPP` in `script.js` to the 10-digit Indian mobile number (without +91). The WhatsApp contact remains hidden until a valid number is configured.
