export default function Explanations() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Risk Explanation</h1>
      <p className="mb-2">This page will display detailed explanations of the risks associated with the identified vulnerabilities in your dependencies. It will provide insights into the severity, potential impact, and recommended actions to mitigate these risks.</p>
      <p className="mb-2">The explanations are generated based on the context of your repository, the specific vulnerabilities found, and industry best practices for addressing them. This information can help you prioritize which vulnerabilities to address first and understand the implications of each one.</p>
      <p className="mb-2">Please note that the explanations are meant to guide you in making informed decisions about how to manage and mitigate risks in your project. Always consider the specific context of your application and consult with security experts if needed.</p>
    </div>
    )
}