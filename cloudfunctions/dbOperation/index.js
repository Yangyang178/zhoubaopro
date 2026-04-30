const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { action, data } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  console.log(`=== 云数据库操作: ${action} ===`)
  console.log('用户openid:', openid)

  try {
    switch (action) {
      case 'add':
        return await addRecord(openid, data)
      
      case 'list':
        return await getRecords(openid, data)
      
      case 'delete':
        return await deleteRecord(openid, data)
      
      case 'clearAll':
        return await clearAllRecords(openid)
      
      case 'getCount':
        return await getCount(openid)
      
      default:
        throw new Error(`未知操作类型: ${action}`)
    }
  } catch (error) {
    console.error('操作失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 添加记录
async function addRecord(openid, data) {
  if (!data || !data.content) {
    throw new Error('内容不能为空')
  }

  const record = {
    _openid: openid,
    content: data.content,
    position: data.position || '',
    positionName: data.positionName || '通用',
    createTime: db.serverDate(),
    timestamp: Date.now()
  }

  const result = await db.collection('report_history').add({
    data: record
  })

  console.log('✅ 添加成功，ID:', result._id)

  return {
    success: true,
    data: {
      id: result._id,
      message: '保存成功'
    }
  }
}

// 获取记录列表
async function getRecords(openid, options = {}) {
  const { page = 1, pageSize = 20 } = options
  const skip = (page - 1) * pageSize

  // 查询总数
  const countResult = await db.collection('report_history')
    .where({ _openid: openid })
    .count()

  // 查询数据（按时间倒序）
  const listResult = await db.collection('report_history')
    .where({ _openid: openid })
    .orderBy('createTime', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  console.log(`📋 查询到 ${listResult.data.length} 条记录`)

  return {
    success: true,
    data: {
      list: listResult.data,
      total: countResult.total,
      page: page,
      pageSize: pageSize
    }
  }
}

// 删除单条记录
async function deleteRecord(openid, data) {
  if (!data || !data.id) {
    throw new Error('记录ID不能为空')
  }

  // 验证归属权，防止删除别人的数据
  const checkResult = await db.collection('report_history')
    .where({
      _id: data.id,
      _openid: openid
    })
    .count()

  if (checkResult.total === 0) {
    throw new Error('无权删除此记录或记录不存在')
  }

  await db.collection('report_history').doc(data.id).remove()

  console.log('🗑️ 删除成功:', data.id)

  return {
    success: true,
    data: { message: '删除成功' }
  }
}

// 清空所有记录
async function clearAllRecords(openid) {
  // 使用云函数批量删除（最多删除20条）
  const batchSize = 20
  let deletedCount = 0

  while (true) {
    const records = await db.collection('report_history')
      .where({ _openid: openid })
      .limit(batchSize)
      .field({ _id: true })
      .get()

    if (records.data.length === 0) break

    const ids = records.data.map(item => item._id)
    
    // 批量删除
    const batch = db.collection('report_history')
    
    for (const id of ids) {
      await batch.doc(id).remove()
      deletedCount++
    }
  }

  console.log(`🗑️ 清空完成，共删除 ${deletedCount} 条记录`)

  return {
    success: true,
    data: { 
      message: `已清空 ${deletedCount} 条记录`,
      deletedCount: deletedCount
    }
  }
}

// 获取记录数量
async function getCount(openid) {
  const result = await db.collection('report_history')
    .where({ _openid: openid })
    .count()

  console.log(`📊 总记录数: ${result.total}`)

  return {
    success: true,
    data: {
      count: result.total
    }
  }
}
