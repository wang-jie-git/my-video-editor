'use client'

import { useState } from 'react'
import { testServerAction } from '@/app/actions/test-action'

export default function TestServerActionPage() {
	const [result, setResult] = useState<any>(null)
	const [logs, setLogs] = useState<string[]>([])

	const handleClick = async () => {
		setLogs((prev) => [...prev, 'Calling testServerAction...'])
		try {
			const res = await testServerAction()
			setLogs((prev) => [...prev, `Result: ${JSON.stringify(res)}`])
			setResult(res)
		} catch (error) {
			setLogs((prev) => [...prev, `Error: ${error}`])
		}
	}

	return (
		<div className="min-h-screen p-8">
			<h1 className="text-2xl font-bold mb-4">Server Action Test</h1>
			<button onClick={handleClick} className="px-4 py-2 bg-blue-500 text-white rounded">
				Click Me
			</button>
			<div className="mt-4">
				<h2 className="font-semibold">Logs:</h2>
				{logs.map((log, i) => (
					<div key={i} className="text-sm font-mono text-gray-700">
						{log}
					</div>
				))}
			</div>
			{result && (
				<div className="mt-4">
					<h2 className="font-semibold">Result:</h2>
					<pre className="text-sm bg-gray-100 p-2 rounded">{JSON.stringify(result, null, 2)}</pre>
				</div>
			)}
		</div>
	)
}
