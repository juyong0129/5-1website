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

def strip_protocol(url):
    if url.startswith("http://"):
        return url[len("http://"):]
    elif url.startswith("https://"):
        return url[len("https://"):]
    return url

def update_site():
    name = entry_name.get()
    url = strip_protocol(entry_url.get())
    if not name or not url:
        messagebox.showerror("입력 오류", "사이트 이름과 URL을 모두 입력하세요.")
        return
    try:
        cursor = conn.cursor()
        check_query = "SELECT * FROM sites WHERE name = %s"
        cursor.execute(check_query, (name,))
        result = cursor.fetchone()
        if result:
            update_query = "UPDATE sites SET url = %s WHERE name = %s"
            cursor.execute(update_query, (url, name))
            messagebox.showinfo("성공", f"사이트 '{name}'의 URL이 '{url}'로 업데이트되었습니다.")
        else:
            add_site(name, url)
        conn.commit()
        cursor.close()
        display_data()
    except Exception as e:
        messagebox.showerror("오류 발생", str(e))

def add_site(name, url):
    if messagebox.askyesno("새 사이트 추가", f"사이트 '{name}'가 목록에 없습니다. 새 데이터로 추가할까요?"):
        try:
            cursor = conn.cursor()
            insert_query = "INSERT INTO sites (name, url) VALUES (%s, %s)"
            cursor.execute(insert_query, (name, url))
            conn.commit()
            cursor.close()
            messagebox.showinfo("성공", f"새 사이트 '{name}'가 추가되었습니다.")
        except Exception as e:
            messagebox.showerror("오류 발생", str(e))

def delete_site():
    name = entry_name.get()
    if not name:
        messagebox.showerror("입력 오류", "사이트 이름을 입력하세요.")
        return
    try:
        cursor = conn.cursor()
        delete_query = "DELETE FROM sites WHERE name = %s"
        cursor.execute(delete_query, (name,))
        conn.commit()
        cursor.close()
        messagebox.showinfo("성공", f"사이트 '{name}'가 삭제되었습니다.")
        display_data()
    except Exception as e:
        messagebox.showerror("오류 발생", str(e))

def update_teacher_site():
    name = teacher_entry_name.get()
    url = strip_protocol(teacher_entry_url.get())
    if not name or not url:
        messagebox.showerror("입력 오류", "교사 사이트 이름과 URL을 모두 입력하세요.")
        return
    try:
        cursor = conn.cursor()
        check_query = "SELECT * FROM teacher_sites WHERE name = %s"
        cursor.execute(check_query, (name,))
        result = cursor.fetchone()
        if result:
            update_query_teacher = "UPDATE teacher_sites SET url = %s WHERE name = %s"
            cursor.execute(update_query_teacher, (url, name))
            messagebox.showinfo("성공", f"교사 사이트 '{name}'의 URL이 '{url}'로 업데이트되었습니다.")
        else:
            add_teacher_site(name, url)
        conn.commit()
        cursor.close()
        display_data()
    except Exception as e:
        messagebox.showerror("오류 발생", str(e))

def add_teacher_site(name, url):
    if messagebox.askyesno("새 교사 사이트 추가", f"교사 사이트 '{name}'가 목록에 없습니다. 새 데이터로 추가할까요?"):
        try:
            cursor = conn.cursor()
            insert_query = "INSERT INTO teacher_sites (name, url) VALUES (%s, %s)"
            cursor.execute(insert_query, (name, url))
            conn.commit()
            cursor.close()
            messagebox.showinfo("성공", f"새 교사 사이트 '{name}'가 추가되었습니다.")
        except Exception as e:
            messagebox.showerror("오류 발생", str(e))

def delete_teacher_site():
    name = teacher_entry_name.get()
    if not name:
        messagebox.showerror("입력 오류", "교사 사이트 이름을 입력하세요.")
        return
    try:
        cursor = conn.cursor()
        delete_query = "DELETE FROM teacher_sites WHERE name = %s"
        cursor.execute(delete_query, (name,))
        conn.commit()
        cursor.close()
        messagebox.showinfo("성공", f"교사 사이트 '{name}'가 삭제되었습니다.")
        display_data()
    except Exception as e:
        messagebox.showerror("오류 발생", str(e))

def display_data():
    try:
        cursor = conn.cursor()
        select_query = "SELECT name, url, count FROM sites"
        cursor.execute(select_query)
        rows = cursor.fetchall()
        text_display_sites.config(state=tk.NORMAL)
        text_display_sites.delete('1.0', tk.END)
        for row in rows:
            text_display_sites.insert(tk.END, f"사이트 이름: {row[0]}, 사이트 URL: {row[1]}, 수신 횟수: {row[2]}\n", 'default')
        select_query_teacher = "SELECT name, url, count FROM teacher_sites"
        cursor.execute(select_query_teacher)
        rows = cursor.fetchall()
        text_display_teacher_sites.config(state=tk.NORMAL)
        text_display_teacher_sites.delete('1.0', tk.END)
        for row in rows:
            text_display_teacher_sites.insert(tk.END, f"교사 사이트 이름: {row[0]}, 사이트 URL: {row[1]}, 수신 횟수: {row[2]}\n", 'default')
        text_display_sites.tag_config('default', font=("Arial", 12))
        text_display_sites.config(state=tk.DISABLED)
        text_display_teacher_sites.tag_config('default', font=("Arial", 12))
        text_display_teacher_sites.config(state=tk.DISABLED)
        cursor.close()
    except Exception as e:
        messagebox.showerror("오류 발생", str(e))

# GUI 생성
root = tk.Tk()
root.title("사이트 URL 수정기")
root.geometry("800x600")  # 초기 창 크기 설정

# 주 프레임 생성
main_frame = tk.Frame(root)
main_frame.pack(fill='both', expand=True, padx=10, pady=10)

# 입력 UI 요소들 배치 (왼쪽)
left_input_frame = tk.Frame(main_frame)
left_input_frame.pack(side='left', fill='both', expand=True, padx=10, pady=10)
tk.Label(left_input_frame, text="사이트 이름:", font=("Arial", 12)).grid(row=0, column=0, padx=10, pady=5)
entry_name = tk.Entry(left_input_frame, font=("Arial", 12))
entry_name.grid(row=0, column=1, padx=10, pady=5)
tk.Label(left_input_frame, text="새로운 사이트 URL:", font=("Arial", 12)).grid(row=1, column=0, padx=10, pady=5)
entry_url = tk.Entry(left_input_frame, font=("Arial", 12))
entry_url.grid(row=1, column=1, padx=10, pady=5)
update_button = tk.Button(left_input_frame, text="수정", font=("Arial", 12), command=update_site)
update_button.grid(row=2, columnspan=2, pady=10)
delete_button = tk.Button(left_input_frame, text="삭제", font=("Arial", 12), command=delete_site)
delete_button.grid(row=2, column=2, pady=10)
text_display_sites = tk.Text(left_input_frame, height=20, width=60)
text_display_sites.grid(row=3, columnspan=3, padx=10, pady=10)
text_display_sites.config(state=tk.DISABLED)

# 입력 UI 요소들 배치 (오른쪽)
right_input_frame = tk.Frame(main_frame)
right_input_frame.pack(side='right', fill='both', expand=True, padx=10, pady=10)
tk.Label(right_input_frame, text="교사 사이트 이름:", font=("Arial", 12)).grid(row=0, column=0, padx=10, pady=5)
teacher_entry_name = tk.Entry(right_input_frame, font=("Arial", 12))
teacher_entry_name.grid(row=0, column=1, padx=10, pady=5)
tk.Label(right_input_frame, text="새로운 교사 사이트 URL:", font=("Arial", 12)).grid(row=1, column=0, padx=10, pady=5)
teacher_entry_url = tk.Entry(right_input_frame, font=("Arial", 12))
teacher_entry_url.grid(row=1, column=1, padx=10, pady=5)
update_button_teacher = tk.Button(right_input_frame, text="수정", font=("Arial", 12), command=update_teacher_site)
update_button_teacher.grid(row=2, columnspan=2, pady=10)
delete_button_teacher = tk.Button(right_input_frame, text="삭제", font=("Arial", 12), command=delete_teacher_site)
delete_button_teacher.grid(row=2, column=2, pady=10)
text_display_teacher_sites = tk.Text(right_input_frame, height=20, width=60)
text_display_teacher_sites.grid(row=3, columnspan=3, padx=10, pady=10)
text_display_teacher_sites.config(state=tk.DISABLED)

# GUI 실행 전 데이터 표시
display_data()

# GUI 실행
root.mainloop()

# 연결 닫기
conn.close()
