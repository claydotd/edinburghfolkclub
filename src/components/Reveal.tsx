import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';

export type RevealVariant =
  | 'up'
  | 'left'
  | 'right'
  | 'scale'
  | 'fade'
  | 'zoom';

type RevealProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Stagger delay in ms when this block enters view */
  delay?: number;
  /** Entrance motion style */
  variant?: RevealVariant;
};

export default function Reveal({
  children,
  className = '',
  style,
  delay = 0,
  variant = 'up',
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (visible) return;

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  const classes = [
    'about-reveal',
    `about-reveal--${variant}`,
    visible ? 'about-reveal--visible' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={ref}
      className={classes}
      style={{ ...style, '--reveal-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
