import React, { useState, useMemo } from 'react';
import { Party, Property } from '../types';
import { CheckCircle, AlertCircle, TrendingUp, Info, ChevronDown, ChevronUp, DollarSign, ArrowRight, Wallet } from 'lucide-react';
import { getPropertyAdvice } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

interface DistributionViewProps {
  parties: Party[];
  properties: Property[];
  onAssign: (propertyId: string, partyId: string | null) => void;
  onUpdateProperty: (propertyId: string, updates: Partial<Property>) => void;
  totalEstateValue: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(amount);
};

const DistributionView: React.FC<DistributionViewProps> = ({ parties, properties, onAssign, onUpdateProperty, totalEstateValue }) => {
  const [selectedPropForAdvice, setSelectedPropForAdvice] = useState<string | null>(null);
  const [advice, setAdvice] = useState<string>('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [expandedPropertyId, setExpandedPropertyId] = useState<string | null>(null);

  // 1. Calculate financials per party
  const partyFinancials = useMemo(() => {
    return parties.map(party => {
        const targetValue = (totalEstateValue * party.shariahSharePercentage) / 100;
        const assignedProps = properties.filter(p => p.assignedToPartyId === party.id);
        const assignedValue = assignedProps.reduce((sum, p) => sum + p.totalValue, 0);
        // Balance > 0 means they are under-allocated and need CASH.
        // Balance < 0 means they are over-allocated and must PAY CASH.
        const balance = targetValue - assignedValue; 
        return { ...party, targetValue, assignedValue, balance, assignedProps };
      });
  }, [parties, properties, totalEstateValue]);

  // 2. Settlement Logic (Greedy Matcher)
  const settlements = useMemo(() => {
    // Create deep copies to manipulate
    let payers = partyFinancials.filter(p => p.balance < -100).map(p => ({ id: p.id, name: p.name, amount: Math.abs(p.balance) }));
    let receivers = partyFinancials.filter(p => p.balance > 100).map(p => ({ id: p.id, name: p.name, amount: p.balance }));
    
    const transactions: { from: string, to: string, amount: number }[] = [];

    // Sort to handle largest debts/credits first (optional, improves efficiency)
    payers.sort((a, b) => b.amount - a.amount);
    receivers.sort((a, b) => b.amount - a.amount);

    let i = 0; // payers index
    let j = 0; // receivers index

    while (i < payers.length && j < receivers.length) {
        let payer = payers[i];
        let receiver = receivers[j];

        // The amount to settle is the minimum of what payer owes and receiver needs
        let amount = Math.min(payer.amount, receiver.amount);

        if (amount > 0) {
            transactions.push({ from: payer.name, to: receiver.name, amount });
            payer.amount -= amount;
            receiver.amount -= amount;
        }

        // If settled, move to next
        if (payer.amount < 100) i++;
        if (receiver.amount < 100) j++;
    }
    return transactions;
  }, [partyFinancials]);

  // 3. Chart Data Preparation
  const chartData = partyFinancials.map(p => ({
    name: p.name.split(' ')[0], // Short name
    'Asset Value': p.assignedValue,
    'Cash Adjustment': p.balance, // Can be positive or negative
    'Target Share': p.targetValue
  }));

  const handleGetAdvice = async (propId: string, partyId: string) => {
    const prop = properties.find(p => p.id === propId);
    const party = parties.find(p => p.id === partyId);
    if (prop && party) {
      setLoadingAdvice(true);
      setSelectedPropForAdvice(propId);
      const result = await getPropertyAdvice(prop, party);
      setAdvice(result);
      setLoadingAdvice(false);
    }
  };

  const toggleExpand = (id: string) => {
      setExpandedPropertyId(expandedPropertyId === id ? null : id);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Final Settlement Dashboard</h2>
        <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm font-medium flex justify-between">
            <span>Total Estate:</span>
            <span>{formatCurrency(totalEstateValue)}</span>
        </div>
      </div>

      {/* --- Properties Allocation Section --- */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700 px-1">1. Adjust Values & Assign Properties</h3>
        {properties.map(property => {
           const isExpanded = expandedPropertyId === property.id;
           const originalVal = property.originalValue || property.totalValue;
           const diffPercent = ((property.totalValue - originalVal) / originalVal) * 100;
           
           return (
            <div key={property.id} className="bg-white rounded-xl shadow-md border-l-4 border-emerald-500 overflow-hidden">
                <div className="p-4">
                    <div className="flex justify-between items-start mb-2 cursor-pointer" onClick={() => toggleExpand(property.id)}>
                    <div>
                        <h4 className="font-bold text-gray-900 flex items-center gap-2">
                            {property.name} 
                            {isExpanded ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
                        </h4>
                        <p className="text-xs text-gray-500">{property.type} • {property.areaSqYards.toFixed(1)} sq yds</p>
                    </div>
                    <div className="text-right">
                        <span className="block text-sm font-bold text-emerald-700">{formatCurrency(property.totalValue)}</span>
                        {Math.abs(diffPercent) > 0.1 && (
                            <span className={`text-[10px] font-medium ${diffPercent > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                {diffPercent > 0 ? '+' : ''}{diffPercent.toFixed(1)}% vs Market
                            </span>
                        )}
                    </div>
                    </div>
                    
                    {/* Value Negotiation Slider */}
                    {isExpanded && (
                        <div className="mb-4 mt-4 p-3 bg-gray-50 rounded-lg animate-in slide-in-from-top-2">
                             <label className="text-xs font-bold text-gray-600 uppercase flex items-center gap-1 mb-2">
                                <DollarSign size={12}/> Negotiate Value
                             </label>
                             <div className="flex items-center gap-3">
                                 <input 
                                    type="range" 
                                    min={0}
                                    max={originalVal * 2.5}
                                    step={10000}
                                    value={property.totalValue}
                                    onChange={(e) => onUpdateProperty(property.id, { totalValue: Number(e.target.value) })}
                                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                 />
                                 <input 
                                    type="number"
                                    value={property.totalValue}
                                    onChange={(e) => onUpdateProperty(property.id, { totalValue: Number(e.target.value) })}
                                    className="w-24 p-1 text-right text-sm border rounded focus:ring-emerald-500 outline-none"
                                 />
                             </div>
                             <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                                 <span>0</span>
                                 <span>Market Est: {formatCurrency(originalVal)}</span>
                                 <span>Max</span>
                             </div>
                        </div>
                    )}

                    <div className="mt-3">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Assign To</label>
                    <select 
                        className="w-full mt-1 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={property.assignedToPartyId || ''}
                        onChange={(e) => {
                        const val = e.target.value;
                        onAssign(property.id, val === '' ? null : val);
                        setAdvice(''); // Clear old advice
                        setSelectedPropForAdvice(null);
                        }}
                    >
                        <option value="">-- Unassigned --</option>
                        {parties.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (Share: {p.shariahSharePercentage.toFixed(1)}%)</option>
                        ))}
                    </select>
                    </div>

                    {property.assignedToPartyId && (
                    <div className="mt-3">
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleGetAdvice(property.id, property.assignedToPartyId!); }}
                            className="flex items-center text-xs text-indigo-600 font-medium hover:underline"
                        >
                            <TrendingUp size={14} className="mr-1" />
                            AI Benefit Analysis
                        </button>
                        {selectedPropForAdvice === property.id && (
                            <div className="mt-2 p-3 bg-indigo-50 rounded-lg text-sm text-gray-700 animate-in fade-in">
                                {loadingAdvice ? (
                                    <span className="flex items-center gap-2">Generating analysis...</span>
                                ) : (
                                    <div className="whitespace-pre-line">{advice}</div>
                                )}
                            </div>
                        )}
                    </div>
                    )}
                </div>
            </div>
           );
        })}
      </div>

      {/* --- Visual Analysis Section --- */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mt-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-purple-600"/> Fairness Visualization
        </h3>
        <p className="text-xs text-gray-500 mb-4">
            Comparison of Assets Held vs Target Share. 
            <span className="text-green-600 font-bold ml-1">Green</span> is property held. 
            <span className="text-blue-500 font-bold ml-1">Blue</span> is Cash Receivable. 
            <span className="text-red-500 font-bold ml-1">Red</span> is Cash Payable.
        </p>

        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{fontSize: 12}} />
                    <YAxis tickFormatter={(val) => `${(val/100000).toFixed(1)}L`} tick={{fontSize: 10}} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <ReferenceLine y={0} stroke="#000" />
                    <Bar dataKey="Asset Value" stackId="a" fill="#059669" />
                    <Bar dataKey="Cash Adjustment" stackId="a" fill="#3b82f6">
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry['Cash Adjustment'] > 0 ? '#3b82f6' : '#ef4444'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* --- Cash Settlement Plan --- */}
      <div className="space-y-4 mt-6">
        <h3 className="text-lg font-semibold text-gray-700 px-1 flex items-center gap-2">
            <Wallet size={20} className="text-blue-600"/> Cash Settlement Plan
        </h3>
        
        {settlements.length === 0 ? (
            <div className="p-4 bg-gray-100 rounded-lg text-center text-gray-500 text-sm">
                No cash settlements required. All shares are balanced or unassigned.
            </div>
        ) : (
            <div className="space-y-2">
                {settlements.map((tx, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                            <div className="bg-red-50 text-red-700 px-3 py-1 rounded-lg text-sm font-bold min-w-[80px] text-center">
                                {tx.from}
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Pays</span>
                                <ArrowRight size={16} className="text-gray-400" />
                            </div>
                            <div className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-sm font-bold min-w-[80px] text-center">
                                {tx.to}
                            </div>
                        </div>
                        <div className="text-right font-bold text-gray-800 ml-4">
                            {formatCurrency(tx.amount)}
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* --- Detailed Balance Sheet --- */}
      <div className="space-y-4 mt-6">
        <h3 className="text-lg font-semibold text-gray-700 px-1">Detailed Balance Sheet</h3>
        {partyFinancials.map(pf => {
           const isReceiving = pf.balance > 0;
           const isBalanced = Math.abs(pf.balance) < 1000; // Tolerance

           return (
            <div key={pf.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 transition-all duration-300">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-gray-800">{pf.name} <span className="text-xs font-normal text-gray-500">({pf.relation})</span></h4>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">Target: {formatCurrency(pf.targetValue)}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div className="text-gray-500">Properties Held:</div>
                    <div className="text-right font-medium text-emerald-600">{formatCurrency(pf.assignedValue)}</div>
                </div>

                <div className={`p-3 rounded-lg flex items-center justify-between ${isBalanced ? 'bg-gray-100' : isReceiving ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center gap-2">
                        {isBalanced ? <CheckCircle size={18} className="text-gray-500"/> : isReceiving ? <Info size={18} className="text-green-600"/> : <AlertCircle size={18} className="text-red-600"/>}
                        <span className={`text-sm font-bold ${isBalanced ? 'text-gray-700' : isReceiving ? 'text-green-800' : 'text-red-800'}`}>
                            {isBalanced ? 'Settled' : isReceiving ? 'Receives Cash' : 'Pays Cash'}
                        </span>
                    </div>
                    <span className="font-bold text-gray-900">{formatCurrency(Math.abs(pf.balance))}</span>
                </div>
            </div>
           );
        })}
      </div>
    </div>
  );
};

export default DistributionView;