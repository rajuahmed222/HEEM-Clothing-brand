import { useEffect } from 'react'

// Sets the tab title and meta description for a page, restores them on leave, and starts the page at the top.
export default function usePageMeta(title, description) {
  useEffect(() => {
    window.scrollTo(0, 0)
    const prevTitle = document.title
    document.title = `${title} - HEEM`

    let tag = document.querySelector('meta[name="description"]')
    let created = false
    if (!tag) {
      tag = document.createElement('meta')
      tag.setAttribute('name', 'description')
      document.head.appendChild(tag)
      created = true
    }
    const prevDesc = tag.getAttribute('content')
    if (description) tag.setAttribute('content', description)

    return () => {
      document.title = prevTitle
      if (created) tag.remove()
      else if (prevDesc !== null) tag.setAttribute('content', prevDesc)
    }
  }, [title, description])
}