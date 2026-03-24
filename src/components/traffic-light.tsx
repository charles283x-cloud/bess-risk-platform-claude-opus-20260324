interface TrafficLightProps {
  status: "green" | "yellow" | "red";
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-6 h-6",
};

const colorClasses = {
  red: "bg-[#ef4444]",
  yellow: "bg-[#eab308]",
  green: "bg-[#22c55e]",
};

const labelMap = {
  red: "高风险",
  yellow: "有待办",
  green: "正常",
};

export default function TrafficLight({
  status,
  size = "md",
}: TrafficLightProps) {
  return (
    <span className="inline-flex items-center gap-1.5" title={labelMap[status]}>
      <span
        className={`inline-block rounded-full ${sizeClasses[size]} ${colorClasses[status]} shadow-sm`}
      />
      {size === "lg" && (
        <span
          className={`text-sm font-medium ${
            status === "red"
              ? "text-red-600"
              : status === "yellow"
              ? "text-yellow-600"
              : "text-green-600"
          }`}
        >
          {labelMap[status]}
        </span>
      )}
    </span>
  );
}
