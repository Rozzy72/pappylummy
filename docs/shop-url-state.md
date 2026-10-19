# Shop URL state

The URL is authoritative for `teamType`, `club`, `league`, `category`, `size`, and `sort`. Values are validated against the current trusted catalogue and existing sort options. No filter state is duplicated in React state.

Next.js 16's documented native History API integration updates `useSearchParams` without reloading or refetching the server catalogue. Meaningful user changes push one history entry; selecting an unchanged value does nothing. Safe canonicalization uses replace, never push. Back, Forward, refresh and copied URLs therefore reproduce selections.

Clear Filters removes all five filter parameters and **preserves sorting**. The textual active-filter summary remains outside the disclosure; individual filters can be cleared using their All option.

Unsupported keys and invalid single values are removed independently, preserving other valid restrictions. Identical duplicates collapse to one value. Conflicting filter duplicates produce no results and a generic recovery message; they remain unresolved until explicitly changed or cleared. Invalid/conflicting sorting falls back to Featured without removing filters. No raw invalid values are rendered.

The disclosure retains native keyboard semantics with CSS-controlled plus/minus indicators. This stage does not change catalogue filtering semantics, product cards, product data, or persisted shopping state.
