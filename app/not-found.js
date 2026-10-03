import Link from 'next/link';
export default function NotFound() { return <div className="page-wrap empty-state"><p className="eyebrow">404</p><h1>This page stepped out.</h1><Link className="button" href="/">Back to the shop</Link></div>; }
