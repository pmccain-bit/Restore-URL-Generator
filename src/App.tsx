/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  RefreshCcw, 
  Info, 
  ChevronRight,
  Settings2,
  LayoutGrid,
  FileText,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { STUDIOS, AGENCIES, SERVICE_GROUPS, Studio, Agency } from './data';

type Platform = 'google' | 'meta' | 'tiktok' | 'custom';

interface UTMState {
  baseUrl: string;
  platform: Platform;
  utm_source: string;
  utm_medium: string;
  // Substrings
  sv: string; // service group
  pc: string; // promo code
  sn: string[]; // studio names
  sc: string[]; // studio codes
  ag: string; // agency id
  fg: string; // franchise group
  // Platform IDs/Names
  utm_campaign_id: string;
  utm_adset_id: string;
  utm_ad_id: string;
  utm_campaign_name: string;
  utm_adset_name: string;
  utm_ad_name: string;
  // Additional
  utm_content: string;
  customParams: string;
}

const PLATFORM_MACROS = {
  google: {
    utm_campaign_id: '{campaignid}',
    utm_adset_id: '{adgroupid}',
    utm_ad_id: '{creative}',
    utm_campaign_name: '{campaignname}',
    utm_adset_name: '{adgroupname}',
    utm_ad_name: '{creativename}',
    utm_source: 'google',
    utm_medium: 'cpc',
  },
  meta: {
    utm_campaign_id: '{{campaign.id}}',
    utm_adset_id: '{{adset.id}}',
    utm_ad_id: '{{ad.id}}',
    utm_campaign_name: '{{campaign.name}}',
    utm_adset_name: '{{adset.name}}',
    utm_ad_name: '{{ad.name}}',
    utm_source: 'facebook',
    utm_medium: 'cpc',
  },
  tiktok: {
    utm_campaign_id: '{{campaign_id}}',
    utm_adset_id: '{{adgroup_id}}',
    utm_ad_id: '{{ad_id}}',
    utm_campaign_name: '{{campaign_name}}',
    utm_adset_name: '{{adgroup_name}}',
    utm_ad_name: '{{ad_name}}',
    utm_source: 'tiktok',
    utm_medium: 'cpc',
  },
  custom: {
    utm_campaign_id: '',
    utm_adset_id: '',
    utm_ad_id: '',
    utm_campaign_name: '',
    utm_adset_name: '',
    utm_ad_name: '',
    utm_source: '',
    utm_medium: '',
  }
};

export default function App() {
  const [state, setState] = useState<UTMState>({
    baseUrl: 'https://cms.restore.com/',
    platform: 'google',
    utm_source: 'google',
    utm_medium: 'cpc',
    sv: '',
    pc: '',
    sn: [],
    sc: [],
    ag: '',
    fg: 'RLUSA',
    utm_campaign_id: '{campaignid}',
    utm_adset_id: '{adgroupid}',
    utm_ad_id: '{creative}',
    utm_campaign_name: '{campaignname}',
    utm_adset_name: '{adgroupname}',
    utm_ad_name: '{creativename}',
    utm_content: '',
    customParams: '',
  });

  const [copied, setCopied] = useState(false);

  const handlePlatformChange = (platform: Platform) => {
    const macros = PLATFORM_MACROS[platform];
    setState(prev => ({
      ...prev,
      platform,
      ...macros
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setState(prev => ({ ...prev, [name]: value }));
  };

  const handleStudioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    if (!value) return;

    const studio = STUDIOS.find(s => s.code === value || s.name === value);
    if (studio) {
      // Check if already selected
      if (state.sc.includes(studio.code)) return;

      setState(prev => ({
        ...prev,
        sn: [...prev.sn, studio.name],
        sc: [...prev.sc, studio.code]
      }));
    }
  };

  const removeStudio = (index: number) => {
    setState(prev => ({
      ...prev,
      sn: prev.sn.filter((_, i) => i !== index),
      sc: prev.sc.filter((_, i) => i !== index)
    }));
  };

  const handleAgencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setState(prev => ({ ...prev, ag: e.target.value }));
  };

  const finalUrl = useMemo(() => {
    try {
      if (!state.baseUrl) return '';
      
      let baseUrl = state.baseUrl.trim();
      if (!baseUrl.startsWith('http')) {
        baseUrl = `https://${baseUrl}`;
      }

      // Build utm_campaign (substrings)
      const substrings = [
        `ag^${state.ag || 'REQUIRED'}`,
        `sc^${state.sc.length > 0 ? state.sc.join(',') : 'REQUIRED'}`,
        `sn^${state.sn.length > 0 ? state.sn.join(',') : 'REQUIRED'}`,
        `pc^${state.pc || 'REQUIRED'}`,
        `sv^${state.sv || 'REQUIRED'}`,
        `fg^${state.fg || 'REQUIRED'}`
      ];
      
      if (state.customParams) {
        substrings.push(state.customParams);
      }

      const utmCampaign = substrings.join('|');
      
      const params: [string, string][] = [
        ['utm_campaign', utmCampaign],
        ['utm_source', state.utm_source],
        ['utm_medium', state.utm_medium],
      ];
      
      if (state.utm_campaign_id) params.push(['utm_campaign_id', state.utm_campaign_id]);
      if (state.utm_adset_id) params.push(['utm_adset_id', state.utm_adset_id]);
      if (state.utm_ad_id) params.push(['utm_ad_id', state.utm_ad_id]);
      
      if (state.utm_campaign_name) params.push(['utm_campaign_name', state.utm_campaign_name]);
      if (state.utm_adset_name) params.push(['utm_adset_name', state.utm_adset_name]);
      if (state.utm_ad_name) params.push(['utm_ad_name', state.utm_ad_name]);
      
      if (state.utm_content) params.push(['utm_content', state.utm_content]);

      // Manually construct query string to avoid encoding special characters like ^, |, {, }, [, ]
      // which are required for Restore's substring system and platform macros.
      const queryString = params
        .map(([key, value]) => {
          // We only encode spaces and other truly special URL characters, 
          // but keep the Restore-specific and Macro-specific characters literal.
          const safeValue = value.replace(/ /g, '%20');
          return `${key}=${safeValue}`;
        })
        .join('&');

      return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${queryString}`;
    } catch (e) {
      return 'Invalid Base URL';
    }
  }, [state]);

  const checklist = useMemo(() => {
    return [
      { label: 'Required Platform IDs (Campaign, Adset, Ad)', valid: !!(state.utm_campaign_id && state.utm_adset_id && state.utm_ad_id) },
      { label: 'Canonical UTMs (Source, Medium, Campaign)', valid: !!(state.utm_source && state.utm_medium && state.baseUrl) },
      { label: 'All 6 Required Substrings Present', valid: !!(state.ag && state.sc.length > 0 && state.sn.length > 0 && state.pc && state.sv && state.fg) },
      { label: 'Format: key^value with | delimiter', valid: true }, // Built into logic
      { label: 'Base URL is valid', valid: finalUrl !== 'Invalid Base URL' && !!state.baseUrl }
    ];
  }, [state, finalUrl]);

  const isAllValid = useMemo(() => checklist.every(item => item.valid), [checklist]);

  const copyToClipboard = () => {
    if (!isAllValid) return;
    navigator.clipboard.writeText(finalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="bg-white border-b border-black/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">R</div>
            <div>
              <h1 className="text-sm font-semibold uppercase tracking-wider">Restore Hyper Wellness</h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">UTM Builder • v2026.1</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors flex items-center gap-1"
            >
              <Info size={14} />
              Guide
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form */}
        <div className="lg:col-span-7 space-y-8">
          {/* Platform Selection */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
            <div className="flex items-center gap-2 mb-6">
              <LayoutGrid size={18} className="text-blue-600" />
              <h2 className="text-sm font-bold uppercase tracking-tight">Platform Configuration</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['google', 'meta', 'tiktok', 'custom'] as Platform[]).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePlatformChange(p)}
                  className={`px-4 py-3 rounded-xl text-xs font-semibold capitalize transition-all border ${
                    state.platform === p 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' 
                      : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </section>

          {/* Base & Canonical */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Settings2 size={18} className="text-blue-600" />
              <h2 className="text-sm font-bold uppercase tracking-tight">Core Parameters</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Base Landing Page URL</label>
                <input
                  type="text"
                  name="baseUrl"
                  value={state.baseUrl}
                  onChange={handleInputChange}
                  placeholder="https://cms.restore.com/..."
                  className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">UTM Source</label>
                  <input
                    type="text"
                    name="utm_source"
                    value={state.utm_source}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">UTM Medium</label>
                  <input
                    type="text"
                    name="utm_medium"
                    value={state.utm_medium}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Required Substrings */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
            <div className="flex items-center gap-2 mb-6">
              <FileText size={18} className="text-blue-600" />
              <h2 className="text-sm font-bold uppercase tracking-tight">Required Substrings (Key^Value)</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              {/* Agency Dropdown */}
              <div className="relative">
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Agency ID (ag)</label>
                <select
                  name="ag"
                  value={state.ag}
                  onChange={handleAgencyChange}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:border-blue-500 outline-none text-sm appearance-none cursor-pointer"
                >
                  <option value="">Select Agency...</option>
                  {AGENCIES.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-4 bottom-4 text-zinc-400 pointer-events-none" />
              </div>

              {/* Studio Selection */}
              <div className="sm:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Selected Studios ({state.sc.length})</label>
                  {state.sc.length > 0 && (
                    <button 
                      onClick={() => setState(prev => ({ ...prev, sn: [], sc: [] }))}
                      className="text-[10px] font-bold text-red-500 uppercase hover:underline"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2 min-h-[44px] p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                  {state.sc.length === 0 ? (
                    <span className="text-xs text-zinc-400 italic">No studios selected. Use the dropdown below to add.</span>
                  ) : (
                    state.sc.map((code, idx) => (
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        key={code} 
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg shadow-sm"
                      >
                        <span className="text-[11px] font-bold text-blue-700">{code}</span>
                        <span className="text-[11px] text-zinc-600 truncate max-w-[120px]">{state.sn[idx]}</span>
                        <button 
                          onClick={() => removeStudio(idx)}
                          className="ml-1 p-0.5 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-zinc-600 transition-colors"
                        >
                          <RefreshCcw size={10} className="rotate-45" />
                        </button>
                      </motion.div>
                    ))
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Add by Studio Code</label>
                    <select
                      name="sc"
                      value=""
                      onChange={handleStudioChange}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-zinc-200 focus:border-blue-500 outline-none text-sm appearance-none cursor-pointer"
                    >
                      <option value="">Select Code to Add...</option>
                      {STUDIOS.map(s => (
                        <option key={s.code} value={s.code} disabled={state.sc.includes(s.code)}>{s.code}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 bottom-4 text-zinc-400 pointer-events-none" />
                  </div>

                  <div className="relative">
                    <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Add by Studio Name</label>
                    <select
                      name="sn"
                      value=""
                      onChange={handleStudioChange}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-zinc-200 focus:border-blue-500 outline-none text-sm appearance-none cursor-pointer"
                    >
                      <option value="">Select Name to Add...</option>
                      {STUDIOS.map(s => (
                        <option key={s.code} value={s.name} disabled={state.sc.includes(s.code)}>{s.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 bottom-4 text-zinc-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Promo Code - Free Form */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Promo Code (pc)</label>
                <input
                  type="text"
                  name="pc"
                  value={state.pc}
                  onChange={handleInputChange}
                  placeholder="e.g. WINTER25"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:border-blue-500 outline-none text-sm"
                />
              </div>

              {/* Service Group Dropdown */}
              <div className="relative">
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Service Group (sv)</label>
                <select
                  name="sv"
                  value={state.sv}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:border-blue-500 outline-none text-sm appearance-none cursor-pointer"
                >
                  <option value="">Select Service Group...</option>
                  {SERVICE_GROUPS.map(sg => (
                    <option key={sg} value={sg}>{sg}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-4 bottom-4 text-zinc-400 pointer-events-none" />
              </div>

              {/* Franchise Group - Free Form */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Franchise Group (fg)</label>
                <input
                  type="text"
                  name="fg"
                  value={state.fg}
                  onChange={handleInputChange}
                  placeholder="e.g. RLUSA or NA"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:border-blue-500 outline-none text-sm"
                />
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-zinc-100">
              <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Additional Substrings (Optional)</label>
              <input
                type="text"
                name="customParams"
                value={state.customParams}
                onChange={handleInputChange}
                placeholder="e.g. campaign_type^brand"
                className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 focus:border-blue-500 outline-none text-sm"
              />
              <p className="mt-2 text-[10px] text-zinc-400 italic">Separate multiple custom pairs with | (e.g. key1^val1|key2^val2)</p>
            </div>
          </section>

          {/* Platform IDs */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
            <div className="flex items-center gap-2 mb-6">
              <RefreshCcw size={18} className="text-blue-600" />
              <h2 className="text-sm font-bold uppercase tracking-tight">Platform IDs & Names</h2>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Campaign ID*</label>
                  <input
                    type="text"
                    name="utm_campaign_id"
                    value={state.utm_campaign_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-lg bg-zinc-50 border border-zinc-200 focus:border-blue-500 outline-none text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Adset ID*</label>
                  <input
                    type="text"
                    name="utm_adset_id"
                    value={state.utm_adset_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-lg bg-zinc-50 border border-zinc-200 focus:border-blue-500 outline-none text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Ad ID*</label>
                  <input
                    type="text"
                    name="utm_ad_id"
                    value={state.utm_ad_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-lg bg-zinc-50 border border-zinc-200 focus:border-blue-500 outline-none text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Campaign Name</label>
                  <input
                    type="text"
                    name="utm_campaign_name"
                    value={state.utm_campaign_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-lg bg-zinc-50 border border-zinc-200 focus:border-blue-500 outline-none text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Adset Name</label>
                  <input
                    type="text"
                    name="utm_adset_name"
                    value={state.utm_adset_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-lg bg-zinc-50 border border-zinc-200 focus:border-blue-500 outline-none text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1.5 tracking-widest">Ad Name</label>
                  <input
                    type="text"
                    name="utm_ad_name"
                    value={state.utm_ad_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-lg bg-zinc-50 border border-zinc-200 focus:border-blue-500 outline-none text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Output & Checklist */}
        <div className="lg:col-span-5 space-y-8">
          {/* Final URL Output */}
          <section className="bg-zinc-900 rounded-2xl p-6 shadow-xl text-white sticky top-24">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Generated Campaign URL</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyToClipboard}
                  disabled={!isAllValid}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    !isAllValid 
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5' 
                      : copied 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy URL'}
                </button>
              </div>
            </div>
            
            <div className="relative group">
              <div className="w-full min-h-[120px] p-4 rounded-xl bg-black/40 border border-white/10 text-xs font-mono break-all leading-relaxed text-blue-400 overflow-y-auto max-h-[300px]">
                {finalUrl}
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <a 
                  href={finalUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all block"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            {/* Checklist */}
            <div className="mt-8 pt-8 border-t border-white/10">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">Final Checklist</h3>
              <div className="space-y-3">
                {checklist.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className={`mt-0.5 ${item.valid ? 'text-blue-500' : 'text-zinc-600'}`}>
                      {item.valid ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    </div>
                    <span className={`text-[11px] font-medium ${item.valid ? 'text-zinc-300' : 'text-zinc-500'}`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Formatting Example */}
            <div className="mt-8 p-4 rounded-xl bg-white/5 border border-white/5">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">UTM Campaign Structure</h4>
              <code className="text-[10px] text-zinc-400 block break-all">
                utm_campaign=ag^FOO|sc^TX001|sn^Austin|pc^WINTER25|sv^IV|fg^RLUSA
              </code>
            </div>
          </section>

          {/* Guide Tips */}
          <section className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
            <h3 className="text-xs font-bold text-blue-900 uppercase tracking-tight mb-4 flex items-center gap-2">
              <Info size={16} />
              Pro Tips
            </h3>
            <ul className="space-y-3">
              {[
                'IDs are required and authoritative for attribution.',
                'Macros must be platform-specific (e.g. {campaignid} for Google).',
                'Use pipe (|) to delimit substrings, no spaces.',
                'Multiple values in a substring should use commas (,).',
                'Franchise Group (fg) should be "NA" for independent studios.'
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px] text-blue-800 leading-relaxed">
                  <ChevronRight size={12} className="mt-0.5 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-black/5">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest">
            © 2026 Restore Hyper Wellness • Marketing Technology
          </div>
          <div className="flex items-center gap-6">
            <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest">Internal Use Only</span>
            <div className="h-4 w-px bg-zinc-200"></div>
            <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-widest">v2.0 Final</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
