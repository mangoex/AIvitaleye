import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Loader2, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';
import productsData from '../data/products.json';

interface ProductRecommendationsProps {
  report: string | null;
  token: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  benefits: string[];
  ingredients: string[];
}

interface AIRecommendation {
  id: string;
  priority: number;
  system?: string;
  justification: string;
}

export function ProductRecommendations({ report, token }: ProductRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState<number>(3000);

  const fetchRecommendations = async () => {
    if (!report) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/recommend-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ report })
      });

      if (!response.ok) throw new Error('Error al obtener recomendaciones.');
      
      const data = await response.json();
      if (data.recommendations && Array.isArray(data.recommendations)) {
        // Sort by priority (1 is highest)
        const sorted = data.recommendations.sort((a: AIRecommendation, b: AIRecommendation) => a.priority - b.priority);
        setRecommendations(sorted);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (report) {
      fetchRecommendations();
    } else {
      setRecommendations([]);
    }
  }, [report]);

  // Combine AI recommendations with local product data
  const enrichedRecommendations = useMemo(() => {
    return recommendations.map(rec => {
      const productInfo = (productsData as Product[]).find(p => p.id === rec.id);
      return { ...rec, productInfo };
    }).filter(rec => rec.productInfo !== undefined); // remove if not found
  }, [recommendations]);

  // Calculate maximum possible budget (sum of all recommended products)
  const maxPossibleBudget = useMemo(() => {
    return enrichedRecommendations.reduce((sum, item) => sum + (item.productInfo?.price || 0), 0);
  }, [enrichedRecommendations]);

  // Set initial budget slightly above max so everything is selected by default
  useEffect(() => {
    if (maxPossibleBudget > 0) {
      setBudget(maxPossibleBudget + 500);
    }
  }, [maxPossibleBudget]);

  // Filter products based on budget
  const selectedProducts = useMemo(() => {
    let currentTotal = 0;
    const selected = [];

    for (let i = 0; i < enrichedRecommendations.length; i++) {
      const item = enrichedRecommendations[i];
      const price = item.productInfo!.price;

      // Always include the first item (Priority 1) even if budget is 0
      if (i === 0 || currentTotal + price <= budget) {
        selected.push(item);
        currentTotal += price;
      }
    }
    return selected;
  }, [enrichedRecommendations, budget]);

  const currentTotalCost = selectedProducts.reduce((sum, item) => sum + item.productInfo!.price, 0);

  if (!report) {
    return (
      <div className="bg-slate-900 rounded-xl p-8 border border-slate-800 text-center flex flex-col items-center">
        <ShoppingBag className="w-12 h-12 text-slate-700 mb-4" />
        <h3 className="text-xl font-medium text-slate-300 mb-2">Recomendaciones de Soporte</h3>
        <p className="text-slate-500 max-w-md mx-auto">
          Realiza un diagnóstico fotográfico o estructurado para que la Inteligencia Artificial genere una receta de productos personalizada.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Recomendaciones VitalHealth</h2>
            <p className="text-slate-400 text-sm">Productos sugeridos basados en tus hallazgos clínicos</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
            <p className="text-slate-400">Analizando catálogo y calculando compatibilidad...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <p className="text-rose-300 text-sm">{error}</p>
          </div>
        ) : enrichedRecommendations.length > 0 ? (
          <div className="space-y-8">
            
            {/* Presupuesto Slider */}
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
              <div className="flex justify-between items-center mb-4">
                <label className="text-sm font-medium text-slate-300">Ajustar Presupuesto Sugerido</label>
                <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full font-semibold">
                  <DollarSign className="w-4 h-4" />
                  {budget.toLocaleString('es-MX')} MXN
                </div>
              </div>
              <input 
                type="range" 
                min="0" 
                max={Math.max(5000, maxPossibleBudget + 1000)} 
                step="100" 
                value={budget} 
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <p className="text-xs text-slate-500 mt-3 flex items-center gap-2">
                <InfoIcon className="w-4 h-4" />
                Al reducir el presupuesto, el sistema filtrará los productos dejando únicamente los de mayor prioridad clínica.
              </p>
            </div>

            {/* Lista de Productos Seleccionados */}
            <div className="space-y-4">
              <AnimatePresence>
                {selectedProducts.map((item, index) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-slate-800 rounded-xl p-5 border border-slate-700 relative overflow-hidden"
                  >
                    {/* Priority Badge */}
                    <div className="absolute top-0 right-0 bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-bl-xl border-b border-l border-emerald-500/30">
                      Prioridad {item.priority}
                    </div>

                    <div className="flex justify-between items-start mb-3 pr-20">
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-white tracking-wide">{item.productInfo?.name}</h3>
                        {item.system && (
                          <div className="inline-block bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-medium px-2 py-0.5 rounded">
                            {item.system}
                          </div>
                        )}
                      </div>
                      <div className="text-emerald-400 font-bold whitespace-nowrap">
                        ${item.productInfo?.price} MXN
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-sm text-indigo-200 bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-lg">
                        <span className="font-semibold text-indigo-300 mr-1">Justificación Clínica:</span>
                        {item.justification}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-700/50">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Ingredientes Clave</h4>
                        <div className="flex flex-wrap gap-1">
                          {item.productInfo?.ingredients.slice(0, 5).map((ing, i) => (
                            <span key={i} className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded-md">
                              {ing}
                            </span>
                          ))}
                          {(item.productInfo?.ingredients.length || 0) > 5 && (
                            <span className="text-xs bg-slate-700/50 text-slate-400 px-2 py-1 rounded-md">...</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Beneficios</h4>
                        <ul className="text-xs text-slate-300 space-y-1">
                          {item.productInfo?.benefits.slice(0, 3).map((ben, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                              {ben}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Total Resumen */}
            <div className="bg-emerald-500/10 rounded-xl p-5 border border-emerald-500/30 flex justify-between items-center mt-6">
              <div>
                <h4 className="text-lg font-bold text-white">Inversión Sugerida</h4>
                <p className="text-sm text-emerald-200/70">{selectedProducts.length} producto(s) seleccionados</p>
              </div>
              <div className="text-2xl font-black text-emerald-400">
                ${currentTotalCost.toLocaleString('es-MX')} MXN
              </div>
            </div>

          </div>
        ) : (
          <div className="text-center py-10 text-slate-400">
            No se generaron recomendaciones específicas para este diagnóstico.
          </div>
        )}
      </div>
    </div>
  );
}

function InfoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
