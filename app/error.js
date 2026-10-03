'use client';
export default function ErrorPage({ reset }) { return <div className="page-wrap"><h1>Something went wrong.</h1><p>Please try opening this page again.</p><button className="button" onClick={reset}>Try again</button></div>; }
