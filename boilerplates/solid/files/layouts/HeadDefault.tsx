// Default <head> (can be overridden by pages)

import logoUrl from "../assets/logo.svg";

export default function HeadDefault() {
  if (BATI.has("plausible.io")) {
    return (
      <>
        <link rel="icon" href={logoUrl} />
        {/* See https://plausible.io/docs/plausible-script */}
        {/* TODO: update data-domain */}
        <script defer data-domain="yourdomain.com" src="https://plausible.io/js/script.js" />
      </>
    );
  } else {
    return (
      <>
        <link rel="icon" href={logoUrl} />
      </>
    );
  }
}
