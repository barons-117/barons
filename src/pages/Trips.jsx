import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Trips({ session }) {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('trips')
        .select(`*, trip_segments(*)`)
        .order('created_at')
      if (!error) setTrips(data)
      setLoading(false)
    }
    load()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  if (loading) return <p>Loading...</p>

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>My Trips ({trips.length})</h1>
        <button onClick={handleLogout}>Logout</button>
      </div>
      <ul>
        {trips.map(t => (
          <li key={t.id}>
            <strong>{t.name}</strong>
            {t.tripit_url && <a href={t.tripit_url} target="_blank" rel="noreferrer"> [TripIt]</a>}
            {' — '}{t.trip_segments?.length} segments
          </li>
        ))}
      </ul>
    </div>
  )
}