import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { MapPin, Shield, Calendar, Layers, Sliders, AlertTriangle, CreditCard } from 'lucide-react';

const Rentals = () => {
  const { user, token } = useSelector((state) => state.auth);
  
  // Market Listings
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [maxRate, setMaxRate] = useState('');
  const [radius, setRadius] = useState(50);

  // User Coordinates for Discovery
  const [coords, setCoords] = useState({ lat: 28.6139, lng: 77.2090 }); // Default New Delhi

  // Booking details
  const [selectedTool, setSelectedTool] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [toolBookings, setToolBookings] = useState([]);

  // Comparison
  const [comparisonList, setComparisonList] = useState([]);

  // Leaflet references
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);

  // Fetch Browser Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => console.log('Geolocation permission denied, using defaults.')
      );
    }
  }, []);

  // Fetch Tools from APIs
  const fetchTools = async () => {
    setLoading(true);
    try {
      const url = `/api/tools?lat=${coords.lat}&lng=${coords.lng}&radius=${radius}${
        category !== 'All' ? `&category=${category}` : ''
      }${search ? `&search=${search}` : ''}${maxRate ? `&maxRate=${maxRate}` : ''}`;
      
      const response = await axios.get(url);
      if (response.data.success) {
        setTools(response.data.tools);
        if (response.data.tools.length > 0 && !selectedTool) {
          setSelectedTool(response.data.tools[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching tools:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, [category, search, radius, maxRate, coords]);

  // Fetch Tool Bookings Calendar
  useEffect(() => {
    if (selectedTool) {
      axios.get(`/api/bookings/calendar/${selectedTool._id}`)
        .then(res => {
          if (res.data.success) {
            setToolBookings(res.data.bookings);
          }
        })
        .catch(err => console.error(err));
    }
  }, [selectedTool]);

  // Leaflet Map Setup
  useEffect(() => {
    if (mapRef.current && window.L) {
      const L = window.L;
      
      // Initialize map instance once
      if (!mapInstance.current) {
        mapInstance.current = L.map(mapRef.current).setView([coords.lat, coords.lng], 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapInstance.current);
      } else {
        mapInstance.current.setView([coords.lat, coords.lng], 11);
      }

      // Clear old markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      // Add user position marker
      const userMarker = L.marker([coords.lat, coords.lng], {
        icon: L.divIcon({
          html: `<div class="h-4 w-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-ping"></div>`,
          className: 'custom-user-marker'
        })
      }).addTo(mapInstance.current).bindPopup('<b>Your Location</b>');
      markersRef.current.push(userMarker);

      // Add tool markers
      tools.forEach(tool => {
        if (tool.location && tool.location.coordinates) {
          const marker = L.marker([tool.location.coordinates[1], tool.location.coordinates[0]])
            .addTo(mapInstance.current)
            .bindPopup(`
              <div class="p-1">
                <p class="font-bold text-slate-800 text-xs">${tool.name}</p>
                <p class="text-[10px] text-slate-500 font-semibold">${tool.category}</p>
                <p class="text-xs text-emerald-600 font-bold mt-1">₹${tool.rentRates.daily}/Day</p>
                <p class="text-[9px] text-slate-400 font-bold mt-0.5">${tool.distance} km away</p>
              </div>
            `);
          markersRef.current.push(marker);
        }
      });
    }
  }, [tools, coords]);

  // Compare Handler
  const toggleComparison = (tool) => {
    const exists = comparisonList.some(item => item._id === tool._id);
    if (exists) {
      setComparisonList(comparisonList.filter(item => item._id !== tool._id));
    } else {
      if (comparisonList.length >= 2) {
        alert('You can compare a maximum of 2 tools at once.');
        return;
      }
      setComparisonList([...comparisonList, tool]);
    }
  };

  // Submit Booking
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      alert('Please fill out rental start and end dates.');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      alert('End date must be after the start date.');
      return;
    }

    // Double Booking Prevention check client-side
    const hasOverlap = toolBookings.some(booking => {
      const bStart = new Date(booking.startDate);
      const bEnd = new Date(booking.endDate);
      return start <= bEnd && end >= bStart;
    });

    if (hasOverlap) {
      alert('Warning: Overlapping booking detected. The selected machine is already rented or pending approval during these dates.');
      return;
    }

    setBookingLoading(true);

    const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
    const totalAmount = days * selectedTool.rentRates.daily;

    try {
      const response = await axios.post('/api/bookings', {
        toolId: selectedTool._id,
        startDate: start,
        endDate: end,
        totalAmount,
        notes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        alert(`✅ Booking requested! Total: ₹${totalAmount}\n\nThe owner will review your request. Once approved, go to Dashboard → Bookings to pay via Razorpay.`);
        setStartDate('');
        setEndDate('');
        setNotes('');
        setToolBookings([...toolBookings, response.data.booking]);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Double booking validation failed on server.');
    } finally {
      setBookingLoading(false);
    }
  };

  const getCalendarStatus = (dateString) => {
    const checkDate = new Date(dateString);
    checkDate.setHours(0, 0, 0, 0);

    const booking = toolBookings.find(b => {
      const start = new Date(b.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(b.endDate);
      end.setHours(0, 0, 0, 0);
      return checkDate >= start && checkDate <= end;
    });

    if (!booking) return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
    if (booking.status === 'Pending') return 'bg-amber-500/20 border-amber-500/40 text-amber-300';
    return 'bg-red-500/20 border-red-500/40 text-red-400';
  };

  const renderVisualCalendar = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 15; i++) {
      const day = new Date(today);
      day.setDate(today.getDate() + i);
      days.push(day);
    }

    return (
      <div className="grid grid-cols-5 gap-2.5">
        {days.map((day, idx) => {
          const dateStr = day.toISOString().split('T')[0];
          const statusClass = getCalendarStatus(dateStr);
          return (
            <div
              key={idx}
              className={`p-2.5 rounded-xl border text-center text-xs flex flex-col items-center justify-center font-bold ${statusClass}`}
            >
              <span className="text-[10px] opacity-60">
                {day.toLocaleDateString(undefined, { weekday: 'short' })}
              </span>
              <span className="text-sm mt-0.5">{day.getDate()}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Equipment Rentals</h1>
        <p className="text-slate-400 text-xs mt-1">Discover, verify, and reserve high-spec agricultural machinery listed by local farmers.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Listings Catalog */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Filters controls */}
          <div className="glass p-5 rounded-2xl border border-slate-800 space-y-4 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {['All', 'Tractor', 'Rotavator', 'Cultivator', 'Seeder', 'Harvester', 'Water Pump'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    category === cat
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex gap-4 items-center bg-slate-950/40 p-2 border border-slate-850 rounded-xl">
              <label className="text-[10px] text-slate-400 font-bold uppercase pl-1">Radius:</label>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 w-24"
              />
              <span className="text-xs font-bold text-emerald-400">{radius} km</span>
            </div>
          </div>

          {/* Cards Grid */}
          {loading ? (
            <div className="text-center py-20 text-slate-500">Loading catalog...</div>
          ) : tools.length === 0 ? (
            <div className="text-center py-20 text-slate-500">No machinery matching criteria found. Try expanding the radius.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tools.map(tool => {
                const isComparing = comparisonList.some(item => item._id === tool._id);
                return (
                  <div
                    key={tool._id}
                    onClick={() => setSelectedTool(tool)}
                    className={`glass-card overflow-hidden rounded-2xl flex flex-col justify-between border cursor-pointer transition-all ${
                      selectedTool?._id === tool._id
                        ? 'border-emerald-500 ring-1 ring-emerald-500'
                        : 'border-slate-800'
                    }`}
                  >
                    <img
                      src={tool.images?.[0] || 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&q=80&w=400'}
                      alt={tool.name}
                      className="h-44 w-full object-cover"
                    />
                    <div className="p-6 space-y-4">
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase">
                            {tool.category}
                          </span>
                          <span className="text-xs font-bold text-amber-500">
                            ⭐ {tool.ratings ? tool.ratings.toFixed(1) : '5.0'}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white mt-1.5">{tool.name}</h3>
                        <p className="text-xs text-slate-400">Listed by {tool.owner?.name || 'Owner'}</p>
                      </div>

                      <div className="flex items-center justify-between bg-slate-950/40 border border-slate-850 p-3 rounded-xl text-xs font-semibold">
                        <div>
                          <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Daily Rent</p>
                          <p className="text-emerald-400 font-extrabold">₹{tool.rentRates.daily}</p>
                        </div>
                        <div className="h-6 w-[1px] bg-slate-800"></div>
                        <div>
                          <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Distance</p>
                          <p className="text-slate-300 font-bold">{tool.distance ? `${tool.distance} km` : 'Local'}</p>
                        </div>
                        <div className="h-6 w-[1px] bg-slate-800"></div>
                        <div>
                          <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Travel Time</p>
                          <p className="text-slate-300 font-bold">{tool.travelTime ? `${tool.travelTime}m` : 'Quick'}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTool(tool);
                          }}
                          className="flex-grow bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors shadow-md"
                        >
                          Book Machine
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleComparison(tool);
                          }}
                          className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                            isComparing
                              ? 'bg-amber-500 border-amber-500 text-white shadow-lg'
                              : 'bg-slate-900 border-slate-850 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          ⚖️ {isComparing ? 'Comparing' : 'Compare'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Comparison Matrix */}
          {comparisonList.length > 0 && (
            <div className="glass p-6 rounded-3xl border border-slate-850 space-y-4 animate-slide-up">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>⚖️</span> Specifications Comparison
                </h3>
                <button
                  onClick={() => setComparisonList([])}
                  className="text-slate-400 hover:text-white text-xs font-bold transition-colors"
                >
                  Clear Comparison
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="space-y-4 font-semibold text-slate-500 pt-16">
                  <div>Category</div>
                  <div>Daily Cost</div>
                  <div>Weekly Rate</div>
                  <div>Monthly Rate</div>
                  <div>Power Rating</div>
                  <div>Fuel Type</div>
                  <div>Average Rating</div>
                </div>
                {comparisonList.map((item, idx) => (
                  <div key={idx} className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800 text-center space-y-4">
                    <p className="font-bold text-emerald-400 truncate">{item.name}</p>
                    <div>{item.category}</div>
                    <div className="font-extrabold text-white">₹{item.rentRates.daily}</div>
                    <div>₹{item.rentRates.weekly}</div>
                    <div>₹{item.rentRates.monthly}</div>
                    <div className="text-slate-300">{item.specifications?.power || 'N/A'}</div>
                    <div className="text-slate-300">{item.specifications?.fuelType || 'Diesel'}</div>
                    <div className="text-amber-500 font-bold">⭐ {item.ratings || '5.0'}</div>
                  </div>
                ))}
                {comparisonList.length === 1 && (
                  <div className="border border-dashed border-slate-800 rounded-2xl flex items-center justify-center text-slate-500 font-medium">
                    Add another machine card to compare side-by-side
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Leaflet Map and Booking Panel */}
        <div className="space-y-8">
          
          {/* Leaflet Radius Map */}
          <div className="glass p-5 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
              <Layers size={18} className="text-emerald-400" /> Geolocation Radius Discovery
            </h3>
            <div className="h-64 rounded-xl overflow-hidden border border-slate-800 relative bg-slate-950">
              <div ref={mapRef} className="h-full w-full"></div>
            </div>
          </div>

          {/* Airbnb Booking Calendar */}
          {selectedTool && (
            <div className="glass p-6 rounded-2xl border border-slate-800 space-y-6">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="text-emerald-400" size={20} /> Booking Calendar
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Review availability blocks for <span className="text-emerald-400 font-bold">{selectedTool.name}</span>
                </p>
              </div>

              {renderVisualCalendar()}

              <div className="bg-slate-950/40 p-4 border border-slate-850 rounded-xl flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 bg-emerald-500 rounded-full"></span>
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 bg-amber-500 rounded-full"></span>
                  <span>Pending</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 bg-red-500 rounded-full"></span>
                  <span>Booked</span>
                </div>
              </div>

              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Start Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">End Date</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Rental Notes</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter instructions (e.g., driver requirements, plot size...)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder-slate-600 resize-none"
                  ></textarea>
                </div>

                {token ? (
                  <button
                    type="submit"
                    disabled={bookingLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs transition-colors shadow-md uppercase tracking-wider"
                  >
                    {bookingLoading ? 'Submitting Request...' : 'Submit Booking Request'}
                  </button>
                ) : (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs p-3 rounded-xl flex items-start gap-2">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    <p>Please log in as a farmer to book shared equipment.</p>
                  </div>
                )}
              </form>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Rentals;
