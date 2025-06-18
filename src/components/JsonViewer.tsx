import React, { useState } from "react";
import { ChevronRight, ChevronDown, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface JsonViewerProps {
  data: any;
  title?: string;
  className?: string;
}

interface JsonNodeProps {
  data: any;
  keyName?: string;
  level?: number;
  isExpanded?: boolean;
  onToggle?: () => void;
}

const JsonNode: React.FC<JsonNodeProps> = ({
  data,
  keyName,
  level = 0,
  isExpanded = false,
  onToggle,
}) => {
  const [copied, setCopied] = useState(false);

  const isObject = data !== null && typeof data === "object";
  const isArray = Array.isArray(data);
  const hasChildren = isObject && Object.keys(data).length > 0;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const getTypeColor = (value: any) => {
    if (value === null) return "text-gray-500";
    if (typeof value === "string") return "text-green-600";
    if (typeof value === "number") return "text-blue-600";
    if (typeof value === "boolean") return "text-purple-600";
    if (Array.isArray(value)) return "text-orange-600";
    return "text-gray-700";
  };

  const getTypeLabel = (value: any) => {
    if (value === null) return "null";
    if (typeof value === "string") return "string";
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "boolean";
    if (Array.isArray(value)) return "array";
    return "object";
  };

  const renderValue = (value: any) => {
    if (value === null)
      return <span className="text-gray-500 italic">null</span>;
    if (typeof value === "string")
      return <span className="text-green-600">"{value}"</span>;
    if (typeof value === "number")
      return <span className="text-blue-600">{value}</span>;
    if (typeof value === "boolean")
      return <span className="text-purple-600">{value.toString()}</span>;
    return null;
  };

  const indent = level * 20;

  if (!isObject) {
    return (
      <div className="flex items-center group" style={{ paddingLeft: indent }}>
        {keyName && (
          <span className="text-gray-700 font-medium mr-2">"{keyName}":</span>
        )}
        {renderValue(data)}
        <span className="ml-2 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
          {getTypeLabel(data)}
        </span>
      </div>
    );
  }

  const isEmpty = Object.keys(data).length === 0;
  const bracketOpen = isArray ? "[" : "{";
  const bracketClose = isArray ? "]" : "}";

  return (
    <div>
      <div className="flex items-center group" style={{ paddingLeft: indent }}>
        {keyName && (
          <span className="text-gray-700 font-medium mr-2">"{keyName}":</span>
        )}

        {hasChildren ? (
          <button
            onClick={onToggle}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 mr-1" />
            ) : (
              <ChevronRight className="h-4 w-4 mr-1" />
            )}
          </button>
        ) : null}

        <span className={`font-mono ${getTypeColor(data)}`}>
          {bracketOpen}
          {isEmpty && bracketClose}
        </span>

        {!isEmpty && !isExpanded && (
          <span className="text-gray-400 ml-1">...</span>
        )}

        {!isEmpty && !isExpanded && (
          <span className={`font-mono ${getTypeColor(data)}`}>
            {bracketClose}
          </span>
        )}

        <span className="ml-2 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
          {getTypeLabel(data)}
        </span>

        {hasChildren && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => copyToClipboard(JSON.stringify(data, null, 2))}
          >
            {copied ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div>
          {Object.entries(data).map(([key, value], index) => (
            <JsonNode
              key={key}
              data={value}
              keyName={key}
              level={level + 1}
              isExpanded={false}
            />
          ))}
          <div className="flex items-center" style={{ paddingLeft: indent }}>
            <span className={`font-mono ${getTypeColor(data)}`}>
              {bracketClose}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const JsonViewer: React.FC<JsonViewerProps> = ({
  data,
  title,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const expandAll = () => {
    setIsExpanded(true);
  };

  const collapseAll = () => {
    setIsExpanded(false);
  };

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-800">
            {title || "JSON Data"}
          </h3>
          <span className="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded">
            {typeof data === "object" && data !== null
              ? Object.keys(data).length
              : 0}{" "}
            items
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={expandAll}
            className="text-xs"
          >
            Expand All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={collapseAll}
            className="text-xs"
          >
            Collapse All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            className="text-xs"
          >
            {copied ? (
              <Check className="h-3 w-3 mr-1" />
            ) : (
              <Copy className="h-3 w-3 mr-1" />
            )}
            Copy
          </Button>
        </div>
      </div>

      <div className="p-4 bg-gray-50 font-mono text-sm overflow-auto max-h-96">
        <JsonNode
          data={data}
          isExpanded={isExpanded}
          onToggle={() => setIsExpanded(!isExpanded)}
        />
      </div>
    </div>
  );
};

export default JsonViewer;
