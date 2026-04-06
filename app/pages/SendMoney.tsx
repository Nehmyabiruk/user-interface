import { useEffect, useState } from "react";
import { ArrowRight, User, DollarSign, MessageSquare } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import { toast } from "sonner";
import axios from "axios";

export default function SendMoney() {
  const [receiverEmail, setReceiverEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [receiverCurrency, setReceiverCurrency] = useState("EUR");
  const [description, setDescription] = useState("");
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [receivedAmount, setReceivedAmount] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rateLoading, setRateLoading] = useState(false);

  const senderCurrency = "USD";

  // Fetch exchange rate
  useEffect(() => {
    const fetchRate = async () => {
      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        setExchangeRate(null);
        setReceivedAmount(null);
        return;
      }

      setRateLoading(true);
      try {
        const res = await axios.get(
          `http://localhost:5000/api/transactions/exchange-rate?from=${senderCurrency}&to=${receiverCurrency}`
        );
        const rate = res.data.rate;
        setExchangeRate(rate);
        setReceivedAmount((parseFloat(amount) * rate).toFixed(2));
      } catch (err) {
        console.error("Rate fetch failed", err);
        setExchangeRate(null);
      } finally {
        setRateLoading(false);
      }
    };

    const timer = setTimeout(fetchRate, 500);
    return () => clearTimeout(timer);
  }, [amount, receiverCurrency]);
  // Create notifications after successful transfer
  const createNotificationsAfterTransfer = async (
    senderName: string,
    receiverName: string,
    transferAmount: number,
    transactionId?: string
  ) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      // Notify Receiver
      await axios.post(
        "http://localhost:5000/api/notifications",   // ← Changed to this
        {
          type: "money_received",
          title: "Money Received ✓",
          message: `You received ${transferAmount} from ${senderName}`,
          data: {
            senderName,
            amount: transferAmount,
            currency: "USD",
            transactionId,
            type: "credit"
          }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Notify Sender
      await axios.post(
        "http://localhost:5000/api/notifications",   // ← Changed to this
        {
          type: "money_sent",
          title: "Transfer Successful",
          message: `You successfully sent ${transferAmount} to ${receiverName}`,
          data: {
            receiverName,
            amount: transferAmount,
            currency: "USD",
            transactionId,
            type: "debit"
          }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("✅ Notifications created successfully");
    } catch (err) {
      console.error("Failed to create notifications:", err);
      // We don't want to show error to user since transfer already succeeded
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Please login first");

      const res = await axios.post(
        "http://localhost:5000/api/transactions/send",
        {
          receiverEmail,
          amount: parseFloat(amount),
          description,
          receiverCurrency,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000,
        }
      );

      if (res.data.success) {
        const { transactionId, receiverName, senderName } = res.data; // Expect these from backend

        toast.success(`Successfully sent $${amount} to ${receiverEmail}!`);

        // Trigger notifications for both users
        await createNotificationsAfterTransfer(
          senderName || "You",
          receiverName || receiverEmail,
          parseFloat(amount),
          transactionId
        );

        // Reset form after success
        setReceiverEmail("");
        setAmount("");
        setDescription("");
        setExchangeRate(null);
        setReceivedAmount(null);
      } else {
        setError(res.data.message || "Transfer failed");
      }
    } catch (err: any) {
      console.error("Send error:", err);

      let errorMessage = "Failed to send money";

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-10 p-8 bg-white rounded-2xl shadow-xl">
      <h2 className="text-3xl font-bold mb-6 text-center">Send Money Abroad</h2>

      {error && <p className="text-red-600 mb-4 text-center">{error}</p>}

      <form onSubmit={handleSend} className="space-y-6">
        <div>
          <Label htmlFor="receiverEmail">Receiver Email</Label>
          <Input
            id="receiverEmail"
            type="email"
            value={receiverEmail}
            onChange={(e) => setReceiverEmail(e.target.value)}
            placeholder="friend@example.com"
            required
          />
        </div>

        <div>
          <Label htmlFor="amount">Amount ({senderCurrency})</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="500.00"
            required
          />
        </div>

        <div>
          <Label htmlFor="receiverCurrency">Receiver Currency</Label>
          <select
            id="receiverCurrency"
            value={receiverCurrency}
            onChange={(e) => setReceiverCurrency(e.target.value)}
            className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="EUR">EUR – Euro</option>
            <option value="GBP">GBP – British Pound</option>
            <option value="AED">AED – UAE Dirham</option>
            <option value="KES">KES – Kenyan Shilling</option>
            <option value="CAD">CAD – Canadian Dollar</option>
            <option value="CHF">CHF – Swiss Franc</option>
          </select>
        </div>

        {/* Live Preview */}
        {amount && (
          <div className="bg-blue-50 p-4 rounded-lg">
            {rateLoading ? (
              <p className="text-blue-700">Fetching rate...</p>
            ) : exchangeRate ? (
              <p className="text-lg">
                Receiver gets ≈ <strong>{receivedAmount} {receiverCurrency}</strong>
                <br />
                <span className="text-sm text-gray-600">
                  Rate: 1 {senderCurrency} ≈ {exchangeRate.toFixed(4)} {receiverCurrency}
                </span>
              </p>
            ) : (
              <p className="text-red-600">Could not fetch rate</p>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="description">Description (optional)</Label>
          <Input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Family support"
          />
        </div>

        <Button
          type="submit"
          disabled={loading || !amount || !receiverEmail}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          {loading ? "Sending..." : "Confirm & Send"}
        </Button>
      </form>
    </div>
  );
}
