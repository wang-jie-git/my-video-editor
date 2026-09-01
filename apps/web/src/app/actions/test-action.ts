'use server'

export async function testServerAction() {
	console.log('========== TEST SERVER ACTION CALLED ==========')
	return { success: true, timestamp: Date.now() }
}
