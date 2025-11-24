import React, { useState, useEffect } from 'react';
import { Users, Home, BarChart3, Calculator, Scale, Plus, Trash2, MapPin, Search, ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Party, Property, PropertyType, Relation } from './types';
import { HISTORICAL_DATA } from './constants';
import { getPropertyValuationEstimate, resolveShariahDispute } from './services/geminiService';
import { calculateShares } from './utils/shariahLogic';
import DistributionView from './components/DistributionView';

const App: React.FC = () => {
  const [step, setStep] = useState(0);
  const [parties, setParties] = useState<Party[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  
  // Temporary Input States
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyRelation, setNewPartyRelation] = useState<Relation>(Relation.SON);
  
  const [newPropName, setNewPropName] = useState('');
  const [newPropType, setNewPropType] = useState<PropertyType>(PropertyType.RESIDENTIAL);
  const [newPropArea, setNewPropArea] = useState(''); // in sq ft
  const [newPropLat, setNewPropLat] = useState('');
  const [newPropLng, setNewPropLng] = useState('');
  const [manualRate, setManualRate] = useState('');
  
  const [aiValuationLoading, setAiValuationLoading] = useState<string | null>(null);

  // Recalculate shares whenever parties change
  useEffect(() => {
    if (parties.length > 0) {
      const updatedShares = calculateShares(parties);
      // Only update if numbers changed to avoid loops
      const currentJson = JSON.stringify(parties.map(p => p.shariahSharePercentage));
      const newJson = JSON.stringify(updatedShares.map(p => p.shariahSharePercentage));
      if (currentJson !== newJson) {
        setParties(updatedShares);
      }
    }
  }, [parties.length, newPartyRelation]); // Simple dependency on length for now

  const addParty = () => {
    if (!newPartyName) return;
    const newParty: Party = {
      id: Date.now().toString(),
      name: newPartyName,
      relation: newPartyRelation,
      shariahSharePercentage: 0
    };
    setParties([...parties, newParty]);
    setNewPartyName('');
  };

  const removeParty = (id: string) => {
    setParties(parties.filter(p => p.id !== id));
  };

  const getGeoLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setNewPropLat(position.coords.latitude.toString());
        setNewPropLng(position.coords.longitude.toString());
      }, () => alert("Could not fetch location"));
    }
  };

  const addProperty = async (useAI: boolean) => {
    if (!newPropName || !newPropArea) return;

    const areaSqFt = parseFloat(newPropArea);
    const areaSqYards = areaSqFt / 9;
    const lat = parseFloat(newPropLat) || 31.5204; // Default Lahore
    const lng = parseFloat(newPropLng) || 74.3587;

    let rate = parseFloat(manualRate) || 0;
    let analysis = '';

    if (useAI) {
        setAiValuationLoading('loading');
        const est = await getPropertyValuationEstimate(areaSqFt, { lat, lng }, newPropType);
        rate = est.rate;
        analysis = est.analysis;
        setAiValuationLoading(null);
    }

    const totalValue = rate * areaSqFt;

    const newProp: Property = {
      id: Date.now().toString(),
      name: newPropName,
      type: newPropType,
      areaSqFt,
      areaSqYards,
      location: { lat, lng },
      valuationSource: useAI ? 'AI' : 'MANUAL',
      pricePerSqFt: rate,
      totalValue: totalValue,
      originalValue: totalValue, // Store initial value for reference during negotiation
      assignedToPartyId: null,
      aiAnalysis: analysis
    };

    setProperties([...properties, newProp]);
    // Reset fields
    setNewPropName('');
    setNewPropArea('');
    setManualRate('');
  };

  const removeProperty = (id: string) => {
    setProperties(properties.filter(p => p.id !== id));
  };

  const handleAssignment = (propId: string, partyId: string | null) => {
    setProperties(properties.map(p => p.id === propId ? { ...p, assignedToPartyId: partyId } : p));
  };

  const handlePropertyUpdate = (propId: string, updates: Partial<Property>) => {
    setProperties(properties.map(p => p.id === propId ? { ...p, ...updates } : p));
  };

  const totalEstateValue = properties.reduce((acc, curr) => acc + curr.totalValue, 0);

  // Render Logic
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans max-w-xl mx-auto shadow-2xl overflow-hidden relative">
      
      {/* Header */}
      <header className="bg-emerald-600 text-white p-5 sticky top-0 z-20 shadow-lg">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-xl font-bold tracking-tight">Warasat Solutions</h1>
                <p className="text-emerald-100 text-xs">Islamic Inheritance & Property Resolver</p>
            </div>
            <div className="flex space-x-1">
               {[0, 1, 2, 3].map(i => (
                   <div key={i} className={`h-2 w-2 rounded-full ${step >= i ? 'bg-white' : 'bg-emerald-800'}`} />
               ))}
            </div>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar pb-24">
        
        {/* Step 0: Parties */}
        {step === 0 && (
          <div className="p-5 space-y-6 animate-in slide-in-from-right duration-300">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
                <Users className="text-emerald-500" /> Inheritors (Parties)
              </h2>
              
              <div className="grid grid-cols-3 gap-2 mb-3">
                <input 
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  placeholder="Name" 
                  className="col-span-2 p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <select 
                   value={newPartyRelation}
                   onChange={(e) => setNewPartyRelation(e.target.value as Relation)}
                   className="bg-gray-50 rounded-xl text-sm p-2 border-none outline-none"
                >
                    {Object.values(Relation).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <button onClick={addParty} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
                <Plus size={20} /> Add Inheritor
              </button>
            </div>

            <div className="space-y-3">
              {parties.map(p => (
                <div key={p.id} className="bg-white p-4 rounded-xl flex justify-between items-center shadow-sm border-l-4 border-emerald-500">
                  <div>
                    <h3 className="font-bold text-gray-800">{p.name}</h3>
                    <p className="text-sm text-gray-500">{p.relation}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
                      {p.shariahSharePercentage.toFixed(2)}%
                    </span>
                    <button onClick={() => removeParty(p.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {parties.length === 0 && <div className="text-center text-gray-400 py-10">No parties added yet.</div>}
            </div>
          </div>
        )}

        {/* Step 1: Properties */}
        {step === 1 && (
          <div className="p-5 space-y-6 animate-in slide-in-from-right duration-300">
             <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
                <Home className="text-emerald-500" /> Add Property
              </h2>

              <div className="space-y-3">
                  <input 
                    value={newPropName} onChange={(e) => setNewPropName(e.target.value)}
                    placeholder="Property Name (e.g. DHA Plot)" 
                    className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <select 
                        value={newPropType} onChange={(e) => setNewPropType(e.target.value as PropertyType)}
                        className="bg-gray-50 rounded-xl p-3 outline-none"
                    >
                        {Object.values(PropertyType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input 
                        type="number"
                        value={newPropArea} onChange={(e) => setNewPropArea(e.target.value)}
                        placeholder="Area (Sq Ft)" 
                        className="bg-gray-50 rounded-xl p-3 outline-none"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                     <input 
                        value={newPropLat} onChange={(e) => setNewPropLat(e.target.value)}
                        placeholder="Latitude" 
                        className="w-full bg-gray-50 rounded-xl p-3 outline-none text-sm"
                     />
                     <input 
                        value={newPropLng} onChange={(e) => setNewPropLng(e.target.value)}
                        placeholder="Longitude" 
                        className="w-full bg-gray-50 rounded-xl p-3 outline-none text-sm"
                     />
                     <button onClick={getGeoLocation} className="bg-blue-100 text-blue-600 p-3 rounded-xl">
                        <MapPin size={20} />
                     </button>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <label className="text-xs text-gray-400 font-semibold uppercase">Valuation</label>
                    <div className="flex gap-2 mt-2">
                        <input 
                            type="number"
                            value={manualRate} onChange={(e) => setManualRate(e.target.value)}
                            placeholder="PKR / sq ft" 
                            className="flex-1 bg-gray-50 rounded-xl p-3 outline-none"
                        />
                         <button 
                            disabled={aiValuationLoading !== null}
                            onClick={() => addProperty(true)} 
                            className="bg-indigo-600 text-white px-4 py-3 rounded-xl font-medium flex items-center gap-2"
                        >
                           {aiValuationLoading ? '...' : <><Calculator size={18}/> AI Rate</>}
                        </button>
                    </div>
                    <button onClick={() => addProperty(false)} className="w-full mt-3 bg-gray-800 text-white py-3 rounded-xl font-medium">
                        Add with Manual Rate
                    </button>
                  </div>
              </div>
            </div>

            <div className="space-y-3">
              {properties.map(p => (
                <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                   <div className="flex justify-between">
                        <div>
                            <h4 className="font-bold">{p.name}</h4>
                            <p className="text-xs text-gray-500">{p.type} • {p.areaSqFt} sqft</p>
                        </div>
                        <div className="text-right">
                             <div className="font-bold text-emerald-600">PKR {p.pricePerSqFt.toLocaleString()} / ft²</div>
                             <div className="text-xs text-gray-400">{p.valuationSource}</div>
                        </div>
                   </div>
                   {p.aiAnalysis && (
                       <div className="mt-2 bg-indigo-50 p-2 rounded text-xs text-indigo-800">
                           {p.aiAnalysis}
                       </div>
                   )}
                   <button onClick={() => removeProperty(p.id)} className="mt-2 text-red-500 text-xs font-bold uppercase tracking-wide">Remove</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Trends */}
        {step === 2 && (
          <div className="p-5 space-y-6 animate-in slide-in-from-right duration-300">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
               <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
                <BarChart3 className="text-emerald-500" /> Historical Trends
               </h2>
               <p className="text-sm text-gray-500 mb-4">Compare average Property Index vs Gold Rate (PKR/Tola) over 20 years.</p>
               
               <div className="h-64 w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={HISTORICAL_DATA}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="year" />
                        <YAxis yAxisId="left" orientation="left" stroke="#d97706" />
                        <YAxis yAxisId="right" orientation="right" stroke="#059669" />
                        <Tooltip />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="goldRate" stroke="#d97706" name="Gold (PKR)" dot={false} strokeWidth={2}/>
                        <Line yAxisId="right" type="monotone" dataKey="propertyIndex" stroke="#059669" name="Property Idx" dot={false} strokeWidth={2}/>
                    </LineChart>
                  </ResponsiveContainer>
               </div>
               <div className="mt-4 bg-yellow-50 p-3 rounded-lg text-yellow-800 text-xs">
                   <strong>Insight:</strong> Gold provides high liquidity, whereas Property in Pakistan has shown step-wise massive jumps (e.g., 2013-2016).
               </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm">
                <h3 className="font-bold mb-2">Total Estate Valuation</h3>
                <div className="text-3xl font-bold text-emerald-700">
                    PKR {totalEstateValue.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                    Based on {properties.length} properties.
                </div>
            </div>
          </div>
        )}

        {/* Step 3: Distribution */}
        {step === 3 && (
            <div className="p-5 animate-in slide-in-from-right duration-300">
                 <DistributionView 
                    parties={parties} 
                    properties={properties} 
                    onAssign={handleAssignment}
                    onUpdateProperty={handlePropertyUpdate}
                    totalEstateValue={totalEstateValue}
                 />
            </div>
        )}

      </main>

      {/* Bottom Navigation / Action Bar */}
      <div className="bg-white border-t border-gray-200 p-4 sticky bottom-0 z-30 pb-6">
        <div className="flex justify-between items-center">
            {step > 0 ? (
                <button 
                onClick={() => setStep(step - 1)}
                className="flex items-center text-gray-600 font-medium px-4 py-2 hover:bg-gray-100 rounded-lg"
                >
                <ChevronLeft size={20} className="mr-1" /> Back
                </button>
            ) : <div/>}

            {step < 3 ? (
                 <button 
                 onClick={() => setStep(step + 1)}
                 disabled={step === 0 && parties.length === 0}
                 className={`flex items-center bg-emerald-600 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:bg-emerald-700 transition-all ${step === 0 && parties.length === 0 ? 'opacity-50' : ''}`}
                 >
                 Next <ArrowRight size={20} className="ml-2" />
                 </button>
            ) : (
                <button 
                 onClick={() => window.print()} // Placeholder for PDF export
                 className="flex items-center bg-gray-900 text-white font-medium px-6 py-3 rounded-xl shadow-lg hover:bg-black"
                 >
                 Export Report
                 </button>
            )}
        </div>
      </div>

    </div>
  );
};

export default App;