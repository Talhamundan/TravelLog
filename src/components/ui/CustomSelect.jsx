// Koyu tema uyumlu, aranabilir basit custom select.
import { ChevronDown, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

export default function CustomSelect({ value, options, placeholder = 'Seçin', onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);
  const normalizedOptions = options.map((option) => (typeof option === 'string' ? { label: option, value: option } : option));
  const selected = normalizedOptions.find((option) => option.value === value)?.label || value || '';
  const filtered = useMemo(
    () => normalizedOptions.filter((option) => option.label.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR'))),
    [normalizedOptions, query],
  );

  useEffect(() => {
    const close = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="custom-select" ref={ref}>
      <button type="button" className="custom-select-trigger" onClick={() => setOpen((value) => !value)}>
        <span>{selected || placeholder}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="custom-select-menu">
          <label>
            <Search size={15} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ara..." autoFocus />
          </label>
          <div>
            {filtered.map((option) => (
              <button
                type="button"
                key={option.value}
                className={option.value === value ? 'selected' : ''}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  setQuery('');
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
