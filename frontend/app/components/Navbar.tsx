'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from 'thirdweb/react';
import { client } from '../client';
import { xLayerTestnet } from '../lib/contracts';

const NAV_ITEMS = [
  { href: '/', label: 'War Room' },
  { href: '/market', label: 'Market' },
  { href: '/nation', label: 'Factions' },
  { href: '/agent', label: 'Agent' },
] as const;

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav>
      <Link href="/" className="nav-logo" aria-label="Open WARCAST war room">
        <Image src="/warcast-mark.svg" alt="" aria-hidden="true" className="nav-logo-mark" width={28} height={28} />
        <span className="nav-logo-text">WARCAST</span>
      </Link>

      <ul className="nav-links" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;

          return (
            <li key={item.href}>
              <Link className={isActive ? 'nav-link active' : 'nav-link'} href={item.href}>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="nav-actions">
        <ConnectButton
          client={client}
          chain={xLayerTestnet}
          connectButton={{
            label: 'Connect Agent',
            className: 'btn-login',
            style: {
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'white',
              borderRadius: '999px',
              padding: '7px 18px',
              fontSize: '0.82rem',
              fontWeight: '500',
            },
          }}
        />
      </div>
    </nav>
  );
}
