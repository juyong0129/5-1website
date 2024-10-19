import tkinter as tk
from tkinter import messagebox
import psycopg2

# PostgreSQL 데이터베이스에 연결
conn = psycopg2.connect(
    dbname="sites_rczm",
    user="sites_rczm_user",
    password="m2qgzFhwq57czj8GqI66SddxGMaGxhjo",
    host="dpg-cs96433qf0us738k1ieg-a.oregon-postgres.render.com",
    port="5432"
)

def update_site():
    name = entry_name.get()
    url = entry_url.get()
    if not name or not url:
        messagebox.showerror("입력 오류", "사이트 이름과 URL을 모두 입력하세요.")
        return

    try:
        cursor = conn.cursor()
        update_query = "UPDATE sites SET url = %s WHERE name = %s"
        cursor.execute(update_query, (url, name))
        cursor.close()
        cursor = conn.cursor()
        update_query_teacher = "UPDATE teacher_sites SET url = %s WHERE name = %s"
        cursor.execute(update_query_teacher, (url, name))
        conn.commit()
        cursor.close()
        messagebox.showinfo("성공", f"사이트 '{name}'의 URL이 '{url}'로 업데이트되었습니다.")
        display_data()
    except Exception as e:
        messagebox.showerror("오류 발생", str(e))

def display_data():
    try:
        cursor = conn.cursor()
        select_query = "SELECT name, url, count FROM sites"
        cursor.execute(select_query)
        rows = cursor.fetchall()
        text_display.config(state=tk.NORMAL)  # 텍스트 박스를 편집 가능하게 설정
        text_display.delete('1.0', tk.END)
        for row in rows:
            text_display.insert(tk.END, f"사이트 이름: {row[0]}, 사이트 URL: {row[1]}, 수신 횟수: {row[2]}\n", 'default')

        select_query_teacher = "SELECT name, url, count FROM teacher_sites"
        cursor.execute(select_query_teacher)
        rows = cursor.fetchall()
        for row in rows:
            text_display.insert(tk.END, f"교사 사이트 이름: {row[0]}, 사이트 URL: {row[1]}, 수신 횟수: {row[2]}\n", 'default')
            
        text_display.tag_config('default', font=("Arial", 12))  # 모든 텍스트를 동일한 폰트로 설정
        text_display.config(state=tk.DISABLED)  # 텍스트 박스를 읽기 전용으로 설정
        cursor.close()
    except Exception as e:
        messagebox.showerror("오류 발생", str(e))

# GUI 생성
root = tk.Tk()
root.title("사이트 URL 수정기")
root.geometry("600x400")  # 초기 창 크기 설정

# 주 프레임 생성
main_frame = tk.Frame(root)
main_frame.pack(fill='both', expand=True, padx=10, pady=10)

# UI 요소들 배치
tk.Label(main_frame, text="사이트 이름:", font=("Arial", 12)).pack(fill='x', padx=10, pady=5)
entry_name = tk.Entry(main_frame, font=("Arial", 12))
entry_name.pack(fill='x', padx=10, pady=5)

tk.Label(main_frame, text="새로운 사이트 URL:", font=("Arial", 12)).pack(fill='x', padx=10, pady=5)
entry_url = tk.Entry(main_frame, font=("Arial", 12))
entry_url.pack(fill='x', padx=10, pady=5)

update_button = tk.Button(main_frame, text="수정", font=("Arial", 12), command=update_site)
update_button.pack(pady=10)

# 데이터 출력 텍스트 박스 (읽기 전용으로 설정)
text_display = tk.Text(main_frame, height=10)
text_display.pack(fill='both', expand=True, pady=10)
text_display.config(state=tk.DISABLED)

# 창 크기에 맞춰 조정
main_frame.pack_propagate(False)

# GUI 실행 전 데이터 표시
display_data()

# GUI 실행
root.mainloop()

# 연결 닫기
conn.close()
