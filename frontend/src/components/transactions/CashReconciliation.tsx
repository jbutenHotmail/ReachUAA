import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Calculator, 
  DollarSign, 
  CreditCard, 
  Smartphone, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  EyeOff,
  RotateCcw
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import { Transaction } from '../../types';
import { formatNumber } from '../../utils/numberUtils';
import DailyTransactions from '../dashboard/DailyTransactions';

interface CashReconciliationProps {
  transactions: Transaction[];
  date: string;
}

interface BillCounts {
  bill_100: number;
  bill_50: number;
  bill_20: number;
  bill_10: number;
  bill_5: number;
  bill_1: number;
}

interface CoinCounts {
  coin_25c: number;
  coin_10c: number;
  coin_5c: number;
  coin_1c: number;
}

interface ReconciliationTotals {
  cash: number;
  checks: number;
  atmMobile: number;
  paypal: number;
  total: number;
}

const CashReconciliation: React.FC<CashReconciliationProps> = ({ transactions, date }) => {
  const { t } = useTranslation();
  
  // Section visibility toggles
  const [showCash, setShowCash] = useState(true);
  const [showChecks, setShowChecks] = useState(true);
  const [showAtmMobile, setShowAtmMobile] = useState(true);
  const [showPaypal, setShowPaypal] = useState(true);
  const [showTransactions, setShowTransactions] = useState(false);
  
  // Cash counting state
  const [billCounts, setBillCounts] = useState<BillCounts>({
    bill_100: 0,
    bill_50: 0,
    bill_20: 0,
    bill_10: 0,
    bill_5: 0,
    bill_1: 0,
  });
  
  const [coinCounts, setCoinCounts] = useState<CoinCounts>({
    coin_25c: 0,
    coin_10c: 0,
    coin_5c: 0,
    coin_1c: 0,
  });
  
  // Manual amounts for other payment methods
  const [manualChecks, setManualChecks] = useState<number>(0);
  const [manualAtmMobile, setManualAtmMobile] = useState<number>(0);
  const [manualPaypal, setManualPaypal] = useState<number>(0);
  
  // Calculate totals from transactions (only approved and pending)
  const transactionTotals: ReconciliationTotals = React.useMemo(() => {
    const validTransactions = transactions.filter(t => 
      t.status !== 'REJECTED' && t.date === date
    );
    
    return validTransactions.reduce((acc, t) => ({
      cash: acc.cash + Number(t.cash),
      checks: acc.checks + Number(t.checks),
      atmMobile: acc.atmMobile + Number(t.atmMobile),
      paypal: acc.paypal + Number(t.paypal),
      total: acc.total + Number(t.total),
    }), {
      cash: 0,
      checks: 0,
      atmMobile: 0,
      paypal: 0,
      total: 0,
    });
  }, [transactions, date]);
  
  // Calculate physical cash total
  const physicalCashTotal = React.useMemo(() => {
    const billsTotal = 
      billCounts.bill_100 * 100 +
      billCounts.bill_50 * 50 +
      billCounts.bill_20 * 20 +
      billCounts.bill_10 * 10 +
      billCounts.bill_5 * 5 +
      billCounts.bill_1 * 1;
      
    const coinsTotal = 
      coinCounts.coin_25c * 0.25 +
      coinCounts.coin_10c * 0.10 +
      coinCounts.coin_5c * 0.05 +
      coinCounts.coin_1c * 0.01;
      
    return billsTotal + coinsTotal;
  }, [billCounts, coinCounts]);
  
  // Calculate reconciliation totals
  const reconciliationTotals: ReconciliationTotals = React.useMemo(() => ({
    cash: physicalCashTotal,
    checks: manualChecks,
    atmMobile: manualAtmMobile,
    paypal: manualPaypal,
    total: physicalCashTotal + manualChecks + manualAtmMobile + manualPaypal,
  }), [physicalCashTotal, manualChecks, manualAtmMobile, manualPaypal]);
  
  // Calculate differences
  const differences = React.useMemo(() => ({
    cash: showCash ? reconciliationTotals.cash - transactionTotals.cash : 0,
    checks: showChecks ? reconciliationTotals.checks - transactionTotals.checks : 0,
    atmMobile: showAtmMobile ? reconciliationTotals.atmMobile - transactionTotals.atmMobile : 0,
    paypal: showPaypal ? reconciliationTotals.paypal - transactionTotals.paypal : 0,
    total: (showCash ? reconciliationTotals.cash : transactionTotals.cash) +
           (showChecks ? reconciliationTotals.checks : transactionTotals.checks) +
           (showAtmMobile ? reconciliationTotals.atmMobile : transactionTotals.atmMobile) +
           (showPaypal ? reconciliationTotals.paypal : transactionTotals.paypal) - transactionTotals.total,
  }), [reconciliationTotals, transactionTotals, showCash, showChecks, showAtmMobile, showPaypal]);
  
  const handleBillChange = (bill: keyof BillCounts, value: string) => {
    const count = parseInt(value) || 0;
    setBillCounts(prev => ({ ...prev, [bill]: Math.max(0, count) }));
  };
  
  const handleCoinChange = (coin: keyof CoinCounts, value: string) => {
    const count = parseInt(value) || 0;
    setCoinCounts(prev => ({ ...prev, [coin]: Math.max(0, count) }));
  };
  
  const resetCashCounts = () => {
    setBillCounts({
      bill_100: 0,
      bill_50: 0,
      bill_20: 0,
      bill_10: 0,
      bill_5: 0,
      bill_1: 0,
    });
    setCoinCounts({
      coin_25c: 0,
      coin_10c: 0,
      coin_5c: 0,
      coin_1c: 0,
    });
  };
  
  const resetAll = () => {
    resetCashCounts();
    setManualChecks(0);
    setManualAtmMobile(0);
    setManualPaypal(0);
  };
  
  const getDifferenceColor = (difference: number) => {
    if (Math.abs(difference) < 0.01) return 'text-success-600';
    return difference > 0 ? 'text-warning-600' : 'text-danger-600';
  };
  
  const getDifferenceBadge = (difference: number) => {
    if (Math.abs(difference) < 0.01) {
      return <Badge variant="success" leftIcon={<CheckCircle size={14} />}>Cuadrado</Badge>;
    }
    return (
      <Badge variant={difference > 0 ? "warning" : "danger"} leftIcon={<AlertTriangle size={14} />}>
        {difference > 0 ? '+' : ''}${difference.toFixed(2)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 mt-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calculator className="text-primary-600" size={24} />
            Cuadre de Caja
          </h2>
          <p className="text-xs text-gray-500">
            {new Date(date).toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              timeZone: 'UTC',
            })}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetAll}
            leftIcon={<RotateCcw size={16} />}
          >
            Limpiar Todo
          </Button>
        </div>
      </div>

      {/* Section Toggles */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
        <span className="text-xs font-medium text-gray-700">Secciones a cuadrar:</span>
        <div className="flex flex-wrap gap-3 sm:gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showTransactions}
              onChange={(e) => setShowTransactions(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-xs font-medium text-gray-700">Mostrar Transacciones</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCash}
              onChange={(e) => setShowCash(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-xs font-medium text-gray-700">Efectivo</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showChecks}
              onChange={(e) => setShowChecks(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-xs font-medium text-gray-700">Cheques</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showAtmMobile}
              onChange={(e) => setShowAtmMobile(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-xs font-medium text-gray-700">ATH Móvil</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showPaypal}
              onChange={(e) => setShowPaypal(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-xs font-medium text-gray-700">PayPal</span>
          </label>
        </div>
      </div>

      {/* Daily Transactions Table - Conditional, now first when active */}
      {showTransactions && (
        <div className="mt-6">
          <DailyTransactions 
            transactions={transactions.filter(t => t.date === date)} 
            date={date}
          />
        </div>
      )}

      {/* Reconciliation Summary - After Transactions */}
      <Card title="Resumen de Cuadre" icon={<Calculator size={16} />} className="py-2">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Método de Pago
                </th>
                <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transacciones
                </th>
                <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Físico/Manual
                </th>
                <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Diferencia
                </th>
                <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {showCash && (
                <tr className="hover:bg-gray-50">
                  <td className="px-2 py-1 whitespace-nowrap text-xs font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <DollarSign size={14} className="text-green-600" />
                      Efectivo
                    </div>
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-xs text-right font-medium text-gray-900">
                    ${formatNumber(transactionTotals.cash)}
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-xs text-right font-medium text-gray-900">
                    ${formatNumber(physicalCashTotal)}
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-xs text-center">
                    <span className={getDifferenceColor(differences.cash)}>
                      {differences.cash > 0 ? '+' : ''}${differences.cash.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-center">
                    {getDifferenceBadge(differences.cash)}
                  </td>
                </tr>
              )}
              
              {showChecks && (
                <tr className="hover:bg-gray-50">
                  <td className="px-2 py-1 whitespace-nowrap text-xs font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <CreditCard size={14} className="text-blue-600" />
                      Cheques
                    </div>
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-xs text-right font-medium text-gray-900">
                    ${formatNumber(transactionTotals.checks)}
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-xs text-right font-medium text-gray-900">
                    ${formatNumber(manualChecks)}
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-xs text-center">
                    <span className={getDifferenceColor(differences.checks)}>
                      {differences.checks > 0 ? '+' : ''}${differences.checks.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-center">
                    {getDifferenceBadge(differences.checks)}
                  </td>
                </tr>
              )}
              
              {showAtmMobile && (
                <tr className="hover:bg-gray-50">
                  <td className="px-2 py-1 whitespace-nowrap text-xs font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <Smartphone size={14} className="text-purple-600" />
                      ATH Móvil
                    </div>
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-xs text-right font-medium text-gray-900">
                    ${formatNumber(transactionTotals.atmMobile)}
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-xs text-right font-medium text-gray-900">
                    ${formatNumber(manualAtmMobile)}
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-xs text-center">
                    <span className={getDifferenceColor(differences.atmMobile)}>
                      {differences.atmMobile > 0 ? '+' : ''}${differences.atmMobile.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-center">
                    {getDifferenceBadge(differences.atmMobile)}
                  </td>
                </tr>
              )}
              
              {showPaypal && (
                <tr className="hover:bg-gray-50">
                  <td className="px-2 py-1 whitespace-nowrap text-xs font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <DollarSign size={14} className="text-indigo-600" />
                      PayPal
                    </div>
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-xs text-right font-medium text-gray-900">
                    ${formatNumber(transactionTotals.paypal)}
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-xs text-right font-medium text-gray-900">
                    ${formatNumber(manualPaypal)}
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-xs text-center">
                    <span className={getDifferenceColor(differences.paypal)}>
                      {differences.paypal > 0 ? '+' : ''}${differences.paypal.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-2 py-1 whitespace-nowrap text-center">
                    {getDifferenceBadge(differences.paypal)}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100">
                <td className="px-2 py-1 text-xs font-bold text-gray-900">
                  TOTAL
                </td>
                <td className="px-2 py-1 whitespace-nowrap text-xs text-right font-bold text-gray-900">
                  ${formatNumber(transactionTotals.total)}
                </td>
                <td className="px-2 py-1 whitespace-nowrap text-xs text-right font-bold text-gray-900">
                  ${formatNumber(
                    (showCash ? reconciliationTotals.cash : 0) +
                    (showChecks ? reconciliationTotals.checks : 0) +
                    (showAtmMobile ? reconciliationTotals.atmMobile : 0) +
                    (showPaypal ? reconciliationTotals.paypal : 0)
                  )}
                </td>
                <td className="px-2 py-1 whitespace-nowrap text-xs text-center">
                  <span className={getDifferenceColor(differences.total)}>
                    {differences.total > 0 ? '+' : ''}${differences.total.toFixed(2)}
                  </span>
                </td>
                <td className="px-2 py-1 whitespace-nowrap text-center">
                  {getDifferenceBadge(differences.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Summary Status */}
        <div className="mt-3 p-2 rounded-lg border-2 border-dashed">
          {Math.abs(differences.total) < 0.01 ? (
            <div className="text-center">
              <CheckCircle className="text-success-600 mx-auto mb-1" size={20} />
              <h3 className="text-xs font-semibold text-success-700">¡Cuadre Perfecto!</h3>
              <p className="text-xs text-success-600">
                Los montos físicos coinciden exactamente con las transacciones registradas.
              </p>
            </div>
          ) : (
            <div className="text-center">
              <AlertTriangle className="text-warning-600 mx-auto mb-1" size={20} />
              <h3 className="text-xs font-semibold text-warning-700">
                Diferencia: ${Math.abs(differences.total).toFixed(2)}
              </h3>
              <p className="text-xs text-warning-600">
                {differences.total > 0 
                  ? 'Hay más dinero físico que transacciones registradas.'
                  : 'Faltan fondos comparado con las transacciones registradas.'
                }
              </p>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cash Counting Section */}
        {showCash && (
          <Card title="Conteo de Efectivo" icon={<DollarSign size={16} />} className="py-3 lg:col-span-2">
            <div className="space-y-5">
              {/* Bills */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Billetes</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 w-10">$100</span>
                    <Input
                      type="number"
                      min="0"
                      value={billCounts.bill_100 || ''}
                      onChange={(e) => handleBillChange('bill_100', e.target.value)}
                      className="w-20 text-sm py-1 h-8 text-center"
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-500 w-12">
                      ${(billCounts.bill_100 * 100).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 w-10">$50</span>
                    <Input
                      type="number"
                      min="0"
                      value={billCounts.bill_50 || ''}
                      onChange={(e) => handleBillChange('bill_50', e.target.value)}
                      className="w-20 text-sm py-1 h-8 text-center"
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-500 w-12">
                      ${(billCounts.bill_50 * 50).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 w-10">$20</span>
                    <Input
                      type="number"
                      min="0"
                      value={billCounts.bill_20 || ''}
                      onChange={(e) => handleBillChange('bill_20', e.target.value)}
                      className="w-20 text-sm py-1 h-8 text-center"
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-500 w-12">
                      ${(billCounts.bill_20 * 20).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 w-10">$10</span>
                    <Input
                      type="number"
                      min="0"
                      value={billCounts.bill_10 || ''}
                      onChange={(e) => handleBillChange('bill_10', e.target.value)}
                      className="w-20 text-sm py-1 h-8 text-center"
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-500 w-12">
                      ${(billCounts.bill_10 * 10).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 w-10">$5</span>
                    <Input
                      type="number"
                      min="0"
                      value={billCounts.bill_5 || ''}
                      onChange={(e) => handleBillChange('bill_5', e.target.value)}
                      className="w-20 text-sm py-1 h-8 text-center"
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-500 w-12">
                      ${(billCounts.bill_5 * 5).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 w-10">$1</span>
                    <Input
                      type="number"
                      min="0"
                      value={billCounts.bill_1 || ''}
                      onChange={(e) => handleBillChange('bill_1', e.target.value)}
                      className="w-20 text-sm py-1 h-8 text-center"
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-500 w-12">
                      ${(billCounts.bill_1 * 1).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Coins */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Monedas</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 w-8">25¢</span>
                    <Input
                      type="number"
                      min="0"
                      value={coinCounts.coin_25c || ''}
                      onChange={(e) => handleCoinChange('coin_25c', e.target.value)}
                      className="w-16 text-sm py-1 h-8 text-center"
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-500 w-12">
                      ${(coinCounts.coin_25c * 0.25).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 w-8">10¢</span>
                    <Input
                      type="number"
                      min="0"
                      value={coinCounts.coin_10c || ''}
                      onChange={(e) => handleCoinChange('coin_10c', e.target.value)}
                      className="w-16 text-sm py-1 h-8 text-center"
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-500 w-12">
                      ${(coinCounts.coin_10c * 0.10).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 w-8">5¢</span>
                    <Input
                      type="number"
                      min="0"
                      value={coinCounts.coin_5c || ''}
                      onChange={(e) => handleCoinChange('coin_5c', e.target.value)}
                      className="w-16 text-sm py-1 h-8 text-center"
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-500 w-12">
                      ${(coinCounts.coin_5c * 0.05).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 w-8">1¢</span>
                    <Input
                      type="number"
                      min="0"
                      value={coinCounts.coin_1c || ''}
                      onChange={(e) => handleCoinChange('coin_1c', e.target.value)}
                      className="w-16 text-sm py-1 h-8 text-center"
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-500 w-12">
                      ${(coinCounts.coin_1c * 0.01).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Total Efectivo Físico:</span>
                  <Badge variant="primary" size="md">
                    ${physicalCashTotal.toFixed(2)}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetCashCounts}
                  className="mt-2 w-full text-sm py-1"
                  leftIcon={<RotateCcw size={16} />}
                >
                  Limpiar Efectivo
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Other Payment Methods - Combined Card */}
        {(showChecks || showAtmMobile || showPaypal) && (
          <Card title="Otros Métodos" icon={<CreditCard size={16} />} className="py-2">
            <div className="space-y-3">
              {showChecks && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cheques</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={manualChecks || ''}
                    onChange={(e) => setManualChecks(parseFloat(e.target.value) || 0)}
                    leftIcon={<CreditCard size={14} />}
                    placeholder="0.00"
                    className="text-sm py-1 h-8"
                  />
                </div>
              )}
              
              {showAtmMobile && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ATH Móvil</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={manualAtmMobile || ''}
                    onChange={(e) => setManualAtmMobile(parseFloat(e.target.value) || 0)}
                    leftIcon={<Smartphone size={14} />}
                    placeholder="0.00"
                    className="text-sm py-1 h-8"
                  />
                </div>
              )}
              
              {showPaypal && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PayPal</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={manualPaypal || ''}
                    onChange={(e) => setManualPaypal(parseFloat(e.target.value) || 0)}
                    leftIcon={<DollarSign size={14} />}
                    placeholder="0.00"
                    className="text-sm py-1 h-8"
                  />
                </div>
              )}
              
              <div className="pt-2 border-t border-gray-200 text-center">
                <div className="grid grid-cols-1 gap-1">
                  {showChecks && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Cheques:</span>
                      <Badge variant="primary" size="sm">${manualChecks.toFixed(2)}</Badge>
                    </div>
                  )}
                  {showAtmMobile && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">ATH:</span>
                      <Badge variant="primary" size="sm">${manualAtmMobile.toFixed(2)}</Badge>
                    </div>
                  )}
                  {showPaypal && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">PayPal:</span>
                      <Badge variant="primary" size="sm">${manualPaypal.toFixed(2)}</Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

    </div>
  );
};

export default CashReconciliation;